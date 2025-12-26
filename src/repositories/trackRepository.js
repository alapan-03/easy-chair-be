const Track = require('../models/track.model');
const TenantRepository = require('./tenantRepository');

class TrackRepository extends TenantRepository {
  constructor() {
    super(Track);
  }
}

module.exports = new TrackRepository();
