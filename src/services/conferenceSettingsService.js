const { ApiError } = require('../utils/errors');
const conferenceSettingsRepository = require('../repositories/conferenceSettingsRepository');

const getSettingsOrThrow = async (orgId, conferenceId) => {
  const settings = await conferenceSettingsRepository.findByConference(orgId, conferenceId);
  if (!settings) {
    throw new ApiError(404, 'CONFERENCE_SETTINGS_NOT_FOUND', 'Conference settings not configured for this conference');
  }
  return settings;
};

module.exports = {
  getSettingsOrThrow,
};
