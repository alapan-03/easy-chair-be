const conferenceService = require('../services/conferenceService');
const conferenceSettingsService = require('../services/conferenceSettingsService');

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

const upsertConferenceSettings = async (req, res) => {
  const { orgId } = req.tenant;
  const { conferenceId } = req.params;
  const result = await conferenceSettingsService.upsertSettings(orgId, conferenceId, req.body);
  const status = result.created ? 201 : 200;
  res.status(status).json(result);
};

module.exports = {
  createConference,
  listConferences,
  upsertConferenceSettings,
};
