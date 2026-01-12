const { ApiError } = require('../utils/errors');
const conferenceRepository = require('../repositories/conferenceRepository');
const trackRepository = require('../repositories/trackRepository');

const createTrack = async (orgId, payload) => {
  const conference = await conferenceRepository.findByIdWithTenant(orgId, payload.conferenceId);
  if (!conference) {
    throw new ApiError(404, 'CONFERENCE_NOT_FOUND', 'Conference not found for this org');
  }

  const existing = await trackRepository.findOne(orgId, {
    conferenceId: payload.conferenceId,
    code: payload.code,
  });

  if (existing) {
    throw new ApiError(409, 'TRACK_EXISTS', 'Track code already exists for this conference');
  }

  return trackRepository.create(orgId, {
    conferenceId: payload.conferenceId,
    name: payload.name,
    code: payload.code,
    status: payload.status || 'ACTIVE',
  });
};

const listTracks = async (orgId, conferenceId) => {
  if (!conferenceId) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'conferenceId is required');
  }
  return trackRepository.find(orgId, { conferenceId });
};

module.exports = {
  createTrack,
  listTracks,
};
