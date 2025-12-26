const SubmissionFile = require('../models/submissionFile.model');
const TenantRepository = require('./tenantRepository');

class SubmissionFileRepository extends TenantRepository {
  constructor() {
    super(SubmissionFile);
  }

  async findBySubmission(orgId, submissionId) {
    return this.find(orgId, { submissionId });
  }
}

module.exports = new SubmissionFileRepository();
