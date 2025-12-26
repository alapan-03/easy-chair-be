const SubmissionTimelineEvent = require('../models/submissionTimelineEvent.model');
const TenantRepository = require('./tenantRepository');

class SubmissionTimelineRepository extends TenantRepository {
  constructor() {
    super(SubmissionTimelineEvent);
  }

  async listBySubmission(orgId, submissionId) {
    return this.find(orgId, { submissionId }, { sort: { createdAt: 1 } });
  }
}

module.exports = new SubmissionTimelineRepository();
