const ConferenceSettings = require('../models/conferenceSettings.model');
const TenantRepository = require('./tenantRepository');

class ConferenceSettingsRepository extends TenantRepository {
  constructor() {
    super(ConferenceSettings);
  }

  async findByConference(orgId, conferenceId) {
    return this.findOne(orgId, { conferenceId });
  }
}

module.exports = new ConferenceSettingsRepository();
