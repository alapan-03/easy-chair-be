const { ApiError } = require('../utils/errors');
const conferenceSettingsRepository = require('../repositories/conferenceSettingsRepository');
const conferenceRepository = require('../repositories/conferenceRepository');

const pickDefined = (obj = {}) =>
  Object.fromEntries(Object.entries(obj).filter(([, value]) => value !== undefined));

const getSettingsOrThrow = async (orgId, conferenceId) => {
  const settings = await conferenceSettingsRepository.findByConference(orgId, conferenceId);
  if (!settings) {
    throw new ApiError(404, 'CONFERENCE_SETTINGS_NOT_FOUND', 'Conference settings not configured for this conference');
  }
  return settings;
};

const upsertSettings = async (orgId, conferenceId, payload = {}) => {
  const conference = await conferenceRepository.findById(orgId, conferenceId);
  if (!conference) {
    throw new ApiError(404, 'CONFERENCE_NOT_FOUND', 'Conference not found for this org');
  }

  const existing = await conferenceSettingsRepository.findByConference(orgId, conferenceId);

  // Support both top-level aliases and nested submissionRules
  const submissionRuleUpdates = pickDefined({
    ...(payload.submissionRules || {}),
    maxFileSizeMb:
      payload.maxFileSize !== undefined
        ? Math.ceil(payload.maxFileSize / (1024 * 1024))
        : undefined,
    allowedTypes: payload.allowedFileTypes,
  });

  const paymentsUpdates = pickDefined(payload.payments || {});
  const aiUpdates = pickDefined(payload.ai || {});
  const certificatesUpdates = pickDefined(payload.certificates || {});

  if (existing) {
    const $set = {};
    if (Object.keys(submissionRuleUpdates).length) {
      $set.submissionRules = { ...existing.submissionRules, ...submissionRuleUpdates };
    }
    if (payload.decisionStatuses) {
      $set.decisionStatuses = payload.decisionStatuses;
    }
    if (Object.keys(paymentsUpdates).length) {
      $set.payments = { ...existing.payments, ...paymentsUpdates };
    }
    if (Object.keys(aiUpdates).length) {
      $set.ai = { ...existing.ai, ...aiUpdates };
    }
    if (Object.keys(certificatesUpdates).length) {
      $set.certificates = { ...existing.certificates, ...certificatesUpdates };
    }

    if (Object.keys($set).length === 0) {
      return { settings: existing, created: false };
    }

    const updated = await conferenceSettingsRepository.updateOne(
      orgId,
      { _id: existing._id },
      { $set },
      { new: true }
    );
    return { settings: updated, created: false };
  }

  const settings = await conferenceSettingsRepository.create(orgId, {
    conferenceId,
    ...(Object.keys(submissionRuleUpdates).length ? { submissionRules: submissionRuleUpdates } : {}),
    ...(payload.decisionStatuses ? { decisionStatuses: payload.decisionStatuses } : {}),
    ...(Object.keys(paymentsUpdates).length ? { payments: paymentsUpdates } : {}),
    ...(Object.keys(aiUpdates).length ? { ai: aiUpdates } : {}),
    ...(Object.keys(certificatesUpdates).length ? { certificates: certificatesUpdates } : {}),
  });

  return { settings, created: true };
};

module.exports = {
  getSettingsOrThrow,
  upsertSettings,
};
