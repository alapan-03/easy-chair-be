const AIReport = require('../models/aiReport.model');
const TenantRepository = require('./tenantRepository');

class AIReportRepository extends TenantRepository {
  constructor() {
    super(AIReport);
  }

  async findBySubmissionAndFile(orgId, submissionId, fileVersionId) {
    return this.model.findOne({
      orgId,
      submissionId,
      fileVersionId,
      isDeleted: false
    }).sort({ createdAt: -1 });
  }

  async findBySubmission(orgId, submissionId) {
    return this.model.find({
      orgId,
      submissionId,
      isDeleted: false
    }).sort({ createdAt: -1 });
  }

  async createReport(data) {
    const {
      orgId,
      conferenceId,
      submissionId,
      fileVersionId,
      runBy,
      runByUserId = null
    } = data;

    return this.model.create({
      orgId,
      conferenceId,
      submissionId,
      fileVersionId,
      status: 'QUEUED',
      provenance: {
        runBy,
        runByUserId,
        runAt: new Date()
      }
    });
  }

  async updateStatus(reportId, status, additionalData = {}) {
    return this.model.findByIdAndUpdate(
      reportId,
      {
        $set: {
          status,
          ...additionalData
        }
      },
      { new: true }
    );
  }

  async updateWithResults(reportId, results) {
    const {
      summary,
      formatCheck,
      similarity,
      providerMeta
    } = results;

    return this.model.findByIdAndUpdate(
      reportId,
      {
        $set: {
          status: 'DONE',
          summary,
          formatCheck,
          similarity,
          'provenance.provider': providerMeta?.provider,
          'provenance.model': providerMeta?.model
        }
      },
      { new: true }
    );
  }

  async markFailed(reportId, code, message) {
    return this.model.findByIdAndUpdate(
      reportId,
      {
        $set: {
          status: 'FAILED',
          failure: { code, message }
        }
      },
      { new: true }
    );
  }

  async findByConference(orgId, conferenceId, filters = {}) {
    const query = {
      orgId,
      conferenceId,
      isDeleted: false
    };

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.flagged !== undefined) {
      query['similarity.flagged'] = filters.flagged;
    }

    const limit = filters.limit || 100;
    const skip = filters.skip || 0;

    return this.model.find(query)
      .populate('submissionId', 'metadata.title createdByUserId')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });
  }

  async countByConference(orgId, conferenceId, filters = {}) {
    const query = {
      orgId,
      conferenceId,
      isDeleted: false
    };

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.flagged !== undefined) {
      query['similarity.flagged'] = filters.flagged;
    }

    return this.model.countDocuments(query);
  }
}

module.exports = new AIReportRepository();
