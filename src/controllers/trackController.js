const trackService = require('../services/trackService');

const createTrack = async (req, res) => {
  const { orgId } = req.tenant;
  const track = await trackService.createTrack(orgId, req.body);
  res.status(201).json(track);
};

const listTracks = async (req, res) => {
  const { orgId } = req.tenant;
  const { conferenceId } = req.query;
  const tracks = await trackService.listTracks(orgId, conferenceId);
  res.json({ data: tracks });
};

module.exports = {
  createTrack,
  listTracks,
};
