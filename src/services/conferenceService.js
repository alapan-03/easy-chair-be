const crypto = require('crypto');
const { ApiError } = require('../utils/errors');
const conferenceRepository = require('../repositories/conferenceRepository');
const slugify = require('../utils/slugify');

const createConference = async (orgId, payload) => {
  const slug = payload.slug ? payload.slug.toLowerCase() : slugify(payload.name);
  const existing = await conferenceRepository.findOne(orgId, { slug });
  if (existing) {
    throw new ApiError(409, 'CONFERENCE_EXISTS', 'Conference slug already exists for this org');
  }

  // Generate unique access token for public signup link
  const accessToken = crypto.randomBytes(32).toString('hex');

  const conference = await conferenceRepository.create(orgId, {
    name: payload.name,
    slug,
    accessToken,
    status: payload.status || 'ACTIVE',
    startDate: payload.startDate,
    endDate: payload.endDate,
  });

  return {
    ...conference.toObject(),
    accessLink: `/conference/join/${accessToken}`,
  };
};

const listConferences = async (orgId) => conferenceRepository.find(orgId);

const getConferenceByAccessToken = async (accessToken) => {
  const conference = await conferenceRepository.findByAccessToken(accessToken);
  if (!conference) {
    throw new ApiError(404, 'CONFERENCE_NOT_FOUND', 'Invalid conference link');
  }
  return conference;
};

const getConferenceById = async (conferenceId) => {
  const conference = await conferenceRepository.findById(conferenceId);
  if (!conference) {
    throw new ApiError(404, 'CONFERENCE_NOT_FOUND', 'Conference not found');
  }
  return conference;
};

module.exports = {
  createConference,
  listConferences,
  getConferenceByAccessToken,
  getConferenceById,
};
