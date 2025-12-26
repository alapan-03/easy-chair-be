const { ApiError } = require('../utils/errors');
const conferenceRepository = require('../repositories/conferenceRepository');
const slugify = require('../utils/slugify');

const createConference = async (orgId, payload) => {
  const slug = payload.slug ? payload.slug.toLowerCase() : slugify(payload.name);
  const existing = await conferenceRepository.findOne(orgId, { slug });
  if (existing) {
    throw new ApiError(409, 'CONFERENCE_EXISTS', 'Conference slug already exists for this org');
  }
  return conferenceRepository.create(orgId, {
    name: payload.name,
    slug,
    status: payload.status || 'ACTIVE',
    startDate: payload.startDate,
    endDate: payload.endDate,
  });
};

const listConferences = async (orgId) => conferenceRepository.find(orgId);

module.exports = {
  createConference,
  listConferences,
};
