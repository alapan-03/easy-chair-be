const authorProfileService = require('../services/authorProfileService');

const upsertProfile = async (req, res) => {
  const { orgId } = req.tenant;
  const profile = await authorProfileService.upsertProfile(orgId, req.user.userId, req.body);
  res.status(201).json(profile);
};

const getProfile = async (req, res) => {
  const { orgId } = req.tenant;
  const profile = await authorProfileService.getProfile(orgId, req.user.userId);
  res.json(profile || {});
};

module.exports = {
  upsertProfile,
  getProfile,
};
