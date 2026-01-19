const submissionService = require('../services/submissionService');

const createSubmission = async (req, res) => {
  const { orgId } = req.tenant;
  const submission = await submissionService.createDraft(orgId, req.user.userId, req.body);
  res.status(201).json(submission);
};

const updateSubmission = async (req, res) => {
  const { orgId } = req.tenant;
  const submission = await submissionService.updateDraft(orgId, req.params.id, req.user.userId, req.body.metadata);
  res.json(submission);
};

const uploadSubmissionFile = async (req, res) => {
  const { orgId } = req.tenant;

  // req.file comes from multer middleware
  if (!req.file) {
    return res.status(400).json({
      code: 'FILE_REQUIRED',
      message: 'No file uploaded. Please upload a PDF file.'
    });
  }

  const filePayload = {
    originalName: req.file.originalname,
    mimeType: req.file.mimetype,
    sizeBytes: req.file.size,
    // The file is already saved to disk by multer, we just need the path
    storagePath: req.file.path,
    storageFilename: req.file.filename,
  };

  const file = await submissionService.uploadFile(orgId, req.params.id, req.user.userId, filePayload);
  res.status(201).json(file);
};

const createPaymentIntent = async (req, res) => {
  const { orgId } = req.tenant;
  const intent = await submissionService.createPaymentIntent(orgId, req.params.id, req.user.userId);
  res.status(201).json(intent);
};

const submit = async (req, res) => {
  const { orgId } = req.tenant;
  const submission = await submissionService.submit(orgId, req.params.id, req.user.userId);
  res.json(submission);
};

const listMySubmissions = async (req, res) => {
  const { orgId } = req.tenant;
  const submissions = await submissionService.listMySubmissions(orgId, req.user.userId);
  res.json({ data: submissions });
};

const getSubmissionDetails = async (req, res) => {
  const { orgId } = req.tenant;
  const result = await submissionService.getSubmissionWithTimeline(orgId, req.params.id, req.user.userId);
  res.json(result);
};

module.exports = {
  createSubmission,
  updateSubmission,
  uploadSubmissionFile,
  createPaymentIntent,
  submit,
  listMySubmissions,
  getSubmissionDetails,
};
