const AuthorProfile = require('../models/authorProfile.model');
const TenantRepository = require('./tenantRepository');

class AuthorProfileRepository extends TenantRepository {
  constructor() {
    super(AuthorProfile);
  }
}

module.exports = new AuthorProfileRepository();
