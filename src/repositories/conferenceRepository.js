const Conference = require('../models/conference.model');
const TenantRepository = require('./tenantRepository');

class ConferenceRepository extends TenantRepository {
  constructor() {
    super(Conference);
  }
}

module.exports = new ConferenceRepository();
