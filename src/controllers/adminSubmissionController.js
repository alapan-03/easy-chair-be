const submissionService = require('../services/submissionService');

const listSubmissions = async (req, res) => {
  const { orgId } = req.tenant;
  const submissions = await submissionService.adminListSubmissions(orgId, req.query);
  res.json({ data: submissions });
};

const setDecision = async (req, res) => {
  const { orgId } = req.tenant;
  const updated = await submissionService.adminSetDecision(orgId, req.params.id, req.user.userId, req.body);
  res.json(updated);
};

const uploadFinalFile = async (req, res) => {
  const { orgId } = req.tenant;
  const file = await submissionService.adminUploadFinalFile(orgId, req.params.id, req.user.userId, req.body);
  res.status(201).json(file);
};

module.exports = {
  listSubmissions,
  setDecision,
  uploadFinalFile,
};
