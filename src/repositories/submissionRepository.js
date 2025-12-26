const Submission = require('../models/submission.model');
const TenantRepository = require('./tenantRepository');

class SubmissionRepository extends TenantRepository {
  constructor() {
    super(Submission);
  }
}

module.exports = new SubmissionRepository();
