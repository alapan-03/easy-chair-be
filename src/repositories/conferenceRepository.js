const Conference = require('../models/conference.model');
const TenantRepository = require('./tenantRepository');

class ConferenceRepository extends TenantRepository {
  constructor() {
    super(Conference);
  }

  // Find conference by public access token (no tenant scope required)
  async findByAccessToken(accessToken) {
    return Conference.findOne({ accessToken, isDeleted: false });
  }

  // Find by ID without tenant scope (for internal use)
  async findById(conferenceId) {
    return Conference.findOne({ _id: conferenceId, isDeleted: false });
  }
}

module.exports = new ConferenceRepository();

