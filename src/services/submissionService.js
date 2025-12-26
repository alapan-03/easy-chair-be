const { ApiError } = require('../utils/errors');
const { SubmissionStatuses, SubmissionTimelineTypes } = require('../constants/submissionStatuses');
const submissionRepository = require('../repositories/submissionRepository');
const conferenceRepository = require('../repositories/conferenceRepository');
const trackRepository = require('../repositories/trackRepository');
const submissionFileRepository = require('../repositories/submissionFileRepository');
const submissionTimelineRepository = require('../repositories/submissionTimelineRepository');
const paymentIntentRepository = require('../repositories/paymentIntentRepository');
const storageProvider = require('./storageProvider');
const conferenceSettingsService = require('./conferenceSettingsService');
const paymentService = require('./paymentService');

const assertAuthor = (submission, userId) => {
  if (String(submission.createdByUserId) !== String(userId)) {
    throw new ApiError(403, 'FORBIDDEN', 'You do not own this submission');
  }
};

const createTimeline = async (orgId, submissionId, type, actorUserId, payload = {}) =>
  submissionTimelineRepository.create(orgId, { submissionId, type, actorUserId, payload });

const ensureConferenceAndTrack = async (orgId, conferenceId, trackId) => {
  const conference = await conferenceRepository.findById(orgId, conferenceId);
  if (!conference) {
    throw new ApiError(404, 'CONFERENCE_NOT_FOUND', 'Conference not found for this org');
  }

  const track = await trackRepository.findById(orgId, trackId);
  if (!track || String(track.conferenceId) !== String(conferenceId)) {
    throw new ApiError(404, 'TRACK_NOT_FOUND', 'Track not found for this conference');
  }
};

const createDraft = async (orgId, userId, payload) => {
  await ensureConferenceAndTrack(orgId, payload.conferenceId, payload.trackId);

  const submission = await submissionRepository.create(orgId, {
    conferenceId: payload.conferenceId,
    trackId: payload.trackId,
    createdByUserId: userId,
    metadata: payload.metadata,
    status: SubmissionStatuses.DRAFT,
  });

  await createTimeline(orgId, submission._id, SubmissionTimelineTypes.CREATED, userId, {
    conferenceId: payload.conferenceId,
    trackId: payload.trackId,
  });

  return submission;
};

const updateDraft = async (orgId, submissionId, userId, metadata) => {
  const submission = await submissionRepository.findById(orgId, submissionId);
  if (!submission) {
    throw new ApiError(404, 'SUBMISSION_NOT_FOUND', 'Submission not found');
  }
  assertAuthor(submission, userId);

  if (submission.status !== SubmissionStatuses.DRAFT) {
    throw new ApiError(400, 'INVALID_STATUS', 'Submission is not editable');
  }

  const updated = await submissionRepository.updateOne(
    orgId,
    { _id: submissionId },
    { $set: { metadata } },
    { new: true }
  );

  await createTimeline(orgId, submissionId, SubmissionTimelineTypes.STATUS_CHANGED, userId, {
    status: updated.status,
    changed: 'metadata',
  });

  return updated;
};

const validateFileRules = (settings, file) => {
  const { maxFileSizeMb, allowedTypes } = settings.submissionRules || {};
  if (maxFileSizeMb && file.sizeBytes > maxFileSizeMb * 1024 * 1024) {
    throw new ApiError(400, 'FILE_TOO_LARGE', `File exceeds max size of ${maxFileSizeMb} MB`);
  }
  if (allowedTypes && allowedTypes.length && !allowedTypes.includes(file.mimeType)) {
    throw new ApiError(400, 'FILE_TYPE_NOT_ALLOWED', 'File type is not allowed');
  }
};

const uploadFile = async (orgId, submissionId, userId, filePayload) => {
  const submission = await submissionRepository.findById(orgId, submissionId);
  if (!submission) {
    throw new ApiError(404, 'SUBMISSION_NOT_FOUND', 'Submission not found');
  }
  assertAuthor(submission, userId);

  if (![SubmissionStatuses.DRAFT, SubmissionStatuses.PAYMENT_PENDING].includes(submission.status)) {
    throw new ApiError(400, 'INVALID_STATUS', 'Cannot upload file for this submission status');
  }

  const settings = await conferenceSettingsService.getSettingsOrThrow(orgId, submission.conferenceId);
  validateFileRules(settings, filePayload);

  const { storageKey } = await storageProvider.putObject({
    orgId,
    submissionId,
    originalName: filePayload.originalName,
  });

  const fileRecord = await submissionFileRepository.create(orgId, {
    submissionId,
    version: 'v1',
    storageKey,
    originalName: filePayload.originalName,
    mimeType: filePayload.mimeType,
    sizeBytes: filePayload.sizeBytes,
    checksum: filePayload.checksum,
    uploadedByUserId: userId,
  });

  await createTimeline(orgId, submissionId, SubmissionTimelineTypes.FILE_UPLOADED, userId, {
    version: 'v1',
    storageKey,
    originalName: filePayload.originalName,
  });

  return fileRecord;
};

const createPaymentIntent = async (orgId, submissionId, userId) => {
  const submission = await submissionRepository.findById(orgId, submissionId);
  if (!submission) {
    throw new ApiError(404, 'SUBMISSION_NOT_FOUND', 'Submission not found');
  }
  assertAuthor(submission, userId);

  const settings = await conferenceSettingsService.getSettingsOrThrow(orgId, submission.conferenceId);

  const intent = await paymentService.createPaymentIntent(orgId, submission, settings, userId);

  await submissionRepository.updateOne(
    orgId,
    { _id: submissionId },
    { $set: { status: SubmissionStatuses.PAYMENT_PENDING } },
    { new: true }
  );

  await createTimeline(orgId, submissionId, SubmissionTimelineTypes.STATUS_CHANGED, userId, {
    status: SubmissionStatuses.PAYMENT_PENDING,
  });

  return intent;
};

const ensurePaymentPaidIfRequired = async (orgId, submissionId, requiredBeforeSubmit) => {
  if (!requiredBeforeSubmit) {
    return;
  }
  const intents = await paymentIntentRepository.findBySubmission(orgId, submissionId);
  const latest = intents?.[0];
  if (!latest || latest.status !== 'PAID') {
    throw new ApiError(400, 'PAYMENT_REQUIRED', 'Payment must be completed before submission');
  }
};

const submit = async (orgId, submissionId, userId) => {
  const submission = await submissionRepository.findById(orgId, submissionId);
  if (!submission) {
    throw new ApiError(404, 'SUBMISSION_NOT_FOUND', 'Submission not found');
  }
  assertAuthor(submission, userId);

  if (![SubmissionStatuses.DRAFT, SubmissionStatuses.PAYMENT_PENDING].includes(submission.status)) {
    throw new ApiError(400, 'INVALID_STATUS', 'Submission cannot be submitted in its current state');
  }

  const settings = await conferenceSettingsService.getSettingsOrThrow(orgId, submission.conferenceId);
  await ensurePaymentPaidIfRequired(orgId, submissionId, settings.payments.requiredBeforeSubmit);

  const updated = await submissionRepository.updateOne(
    orgId,
    { _id: submissionId },
    { $set: { status: SubmissionStatuses.SUBMITTED } },
    { new: true }
  );

  await createTimeline(orgId, submissionId, SubmissionTimelineTypes.SUBMITTED, userId, {
    status: SubmissionStatuses.SUBMITTED,
  });

  return updated;
};

const listMySubmissions = async (orgId, userId) =>
  submissionRepository.find(orgId, { createdByUserId: userId });

const getSubmissionWithTimeline = async (orgId, submissionId, userId) => {
  const submission = await submissionRepository.findById(orgId, submissionId);
  if (!submission) {
    throw new ApiError(404, 'SUBMISSION_NOT_FOUND', 'Submission not found');
  }
  assertAuthor(submission, userId);

  const timeline = await submissionTimelineRepository.listBySubmission(orgId, submissionId);
  const files = await submissionFileRepository.findBySubmission(orgId, submissionId);

  return { submission, timeline, files };
};

const adminListSubmissions = async (orgId, filters = {}) => {
  const query = {};
  if (filters.conferenceId) query.conferenceId = filters.conferenceId;
  if (filters.trackId) query.trackId = filters.trackId;
  if (filters.status) query.status = filters.status;
  return submissionRepository.find(orgId, query);
};

const adminSetDecision = async (orgId, submissionId, adminUserId, payload) => {
  const submission = await submissionRepository.findById(orgId, submissionId);
  if (!submission) {
    throw new ApiError(404, 'SUBMISSION_NOT_FOUND', 'Submission not found');
  }

  const updated = await submissionRepository.updateOne(
    orgId,
    { _id: submissionId },
    {
      $set: {
        decision: {
          status: payload.status,
          notes: payload.notes,
          decidedAt: new Date(),
          decidedBy: adminUserId,
        },
        status: SubmissionStatuses.DECISION_MADE,
      },
    },
    { new: true }
  );

  await createTimeline(orgId, submissionId, SubmissionTimelineTypes.DECISION_SET, adminUserId, {
    status: payload.status,
    notes: payload.notes,
  });

  return updated;
};

const adminUploadFinalFile = async (orgId, submissionId, adminUserId, filePayload) => {
  const submission = await submissionRepository.findById(orgId, submissionId);
  if (!submission) {
    throw new ApiError(404, 'SUBMISSION_NOT_FOUND', 'Submission not found');
  }

  const settings = await conferenceSettingsService.getSettingsOrThrow(orgId, submission.conferenceId);
  if (!settings.submissionRules.allowAdminUploadFinal) {
    throw new ApiError(403, 'FINAL_UPLOAD_NOT_ALLOWED', 'Admin final upload is disabled');
  }

  validateFileRules(settings, filePayload);

  const { storageKey } = await storageProvider.putObject({
    orgId,
    submissionId,
    originalName: filePayload.originalName,
  });

  const fileRecord = await submissionFileRepository.create(orgId, {
    submissionId,
    version: 'final',
    storageKey,
    originalName: filePayload.originalName,
    mimeType: filePayload.mimeType,
    sizeBytes: filePayload.sizeBytes,
    checksum: filePayload.checksum,
    uploadedByUserId: adminUserId,
  });

  await createTimeline(orgId, submissionId, SubmissionTimelineTypes.FILE_UPLOADED, adminUserId, {
    version: 'final',
    storageKey,
    originalName: filePayload.originalName,
  });

  return fileRecord;
};

module.exports = {
  createDraft,
  updateDraft,
  uploadFile,
  createPaymentIntent,
  submit,
  listMySubmissions,
  getSubmissionWithTimeline,
  adminListSubmissions,
  adminSetDecision,
  adminUploadFinalFile,
};
