const conferenceService = require('../services/conferenceService');

const createConference = async (req, res) => {
  const { orgId } = req.tenant;
  const conference = await conferenceService.createConference(orgId, req.body);
  res.status(201).json(conference);
};

const listConferences = async (req, res) => {
  const { orgId } = req.tenant;
  const conferences = await conferenceService.listConferences(orgId);
  res.json({ data: conferences });
};

module.exports = {
  createConference,
  listConferences,
};
