const ConsentRecord = require('../models/consentRecord.model');
const TenantRepository = require('./tenantRepository');

class ConsentRecordRepository extends TenantRepository {
  constructor() {
    super(ConsentRecord);
  }

  async findBySubmissionAndUser(orgId, submissionId, userId) {
    return this.model.findOne({
      orgId,
      submissionId,
      userId,
      isDeleted: false
    });
  }

  async upsertConsent(orgId, conferenceId, submissionId, userId, consentData, metadata = {}) {
    const { consentAI, consentFineTune, ip, userAgent } = consentData;
    
    return this.model.findOneAndUpdate(
      { submissionId, userId },
      {
        $set: {
          orgId,
          conferenceId,
          submissionId,
          userId,
          consentAI,
          consentFineTune,
          capturedAt: new Date(),
          ip: ip || null,
          userAgent: userAgent || null,
          isDeleted: false
        }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  async findByConference(orgId, conferenceId, options = {}) {
    const filter = { orgId, conferenceId, isDeleted: false };
    return this.model.find(filter)
      .populate('userId', 'name email')
      .populate('submissionId', 'metadata.title')
      .limit(options.limit || 100)
      .sort(options.sort || { capturedAt: -1 });
  }

  async hasConsent(submissionId, userId) {
    const record = await this.model.findOne({
      submissionId,
      userId,
      isDeleted: false
    });
    return record && record.consentAI === true;
  }
}

module.exports = new ConsentRecordRepository();
