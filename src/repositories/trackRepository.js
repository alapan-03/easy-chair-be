const Track = require('../models/track.model');
const TenantRepository = require('./tenantRepository');

class TrackRepository extends TenantRepository {
  constructor() {
    super(Track);
  }

  // Find by ID without tenant scope (for internal use)
  async findById(trackId) {
    return Track.findOne({ _id: trackId, isDeleted: false });
  }

  // Find tracks by conference
  async findByConference(conferenceId) {
    return Track.find({ conferenceId, isDeleted: false });
  }
}

module.exports = new TrackRepository();

