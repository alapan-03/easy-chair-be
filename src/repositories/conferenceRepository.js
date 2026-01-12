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

  // Find by ID with tenant scope (for org-scoped operations)
  async findByIdWithTenant(orgId, conferenceId) {
    return Conference.findOne({ _id: conferenceId, orgId, isDeleted: false });
  }

  // Update by ID without tenant scope (for internal use)
  async updateById(conferenceId, updates) {
    return Conference.findByIdAndUpdate(conferenceId, updates, { new: true });
  }
}

module.exports = new ConferenceRepository();



