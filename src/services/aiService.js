const consentRecordRepository = require('../repositories/consentRecordRepository');
const aiReportRepository = require('../repositories/aiReportRepository');
const submissionRepository = require('../repositories/submissionRepository');
const submissionFileRepository = require('../repositories/submissionFileRepository');
const conferenceSettingsRepository = require('../repositories/conferenceSettingsRepository');
const { enqueueAIAnalysis, getQueueStats } = require('./queueService');
const logger = require('../config/logger');
const { NotFoundError, ForbiddenError, BadRequestError } = require('../utils/errors');

class AIService {
  /**
   * Capture AI consent from author
   */
  async captureConsent(orgId, submissionId, userId, consentData, metadata = {}) {
    // Verify submission exists and belongs to user
    const submission = await submissionRepository.findById(orgId, submissionId);
    if (!submission) {
      throw new NotFoundError('Submission not found');
    }

    if (submission.createdByUserId.toString() !== userId.toString()) {
      throw new ForbiddenError('You can only consent for your own submissions');
    }

    const { consentAI, consentFineTune, ip, userAgent } = consentData;

    // Upsert consent record
    const consent = await consentRecordRepository.upsertConsent(
      orgId,
      submission.conferenceId,
      submissionId,
      userId,
      { consentAI, consentFineTune, ip, userAgent },
      metadata
    );

    logger.info({ 
      submissionId, 
      userId, 
      consentAI, 
      consentFineTune 
    }, 'AI consent captured');

    return consent;
  }

  /**
   * Check if user has given AI consent for a submission
   */
  async hasConsent(submissionId, userId) {
    return consentRecordRepository.hasConsent(submissionId, userId);
  }

  /**
   * Trigger AI analysis (manual or auto)
   */
  async triggerAnalysis(orgId, conferenceId, submissionId, fileVersionId, runMode, triggeredByUserId = null) {
    // Verify submission exists
    const submission = await submissionRepository.findById(orgId, submissionId);
    if (!submission) {
      throw new NotFoundError('Submission not found');
    }

    // Verify file exists
    const file = await submissionFileRepository.findById(orgId, fileVersionId);
    if (!file) {
      throw new NotFoundError('File not found');
    }

    // Load conference settings
    const settings = await conferenceSettingsRepository.findByConference(orgId, conferenceId);
    if (!settings) {
      throw new NotFoundError('Conference settings not found');
    }

    // Check if AI is enabled
    if (!settings.ai?.enabled) {
      throw new BadRequestError('AI analysis is not enabled for this conference');
    }

    // Check consent if required
    const consentRequired = settings.ai?.consentRequired !== false; // Default true
    if (consentRequired) {
      const hasConsent = await this.hasConsent(submissionId, submission.createdByUserId);
      if (!hasConsent) {
        throw new ForbiddenError('AI analysis requires author consent');
      }
    }

    // Check if we should run based on runMode setting
    const settingsRunMode = settings.ai?.runMode || 'both';
    if (runMode === 'AUTO' && settingsRunMode === 'manual_only') {
      logger.info({ submissionId }, 'Skipping auto AI analysis - manual_only mode');
      return null;
    }

    // Create AI report record
    const report = await aiReportRepository.createReport({
      orgId,
      conferenceId,
      submissionId,
      fileVersionId,
      runBy: runMode,
      runByUserId: triggeredByUserId
    });

    // Enqueue job
    const job = await enqueueAIAnalysis({
      orgId: orgId.toString(),
      conferenceId: conferenceId.toString(),
      submissionId: submissionId.toString(),
      fileVersionId: fileVersionId.toString(),
      runMode,
      triggeredByUserId: triggeredByUserId ? triggeredByUserId.toString() : null,
      reportId: report._id.toString()
    });

    logger.info({ 
      submissionId, 
      fileVersionId, 
      reportId: report._id,
      jobId: job.id,
      runMode 
    }, 'AI analysis triggered');

    return {
      report,
      jobId: job.id
    };
  }

  /**
   * Get AI report for a submission
   */
  async getReport(orgId, submissionId, fileVersionId = null) {
    if (fileVersionId) {
      return aiReportRepository.findBySubmissionAndFile(orgId, submissionId, fileVersionId);
    }
    
    const reports = await aiReportRepository.findBySubmission(orgId, submissionId);
    return reports[0] || null; // Return most recent
  }

  /**
   * List AI reports with filters (admin only)
   */
  async listReports(orgId, conferenceId, filters = {}) {
    const { status, flagged, limit, skip } = filters;

    const reports = await aiReportRepository.findByConference(orgId, conferenceId, {
      status,
      flagged: flagged === 'true' ? true : flagged === 'false' ? false : undefined,
      limit: limit ? parseInt(limit, 10) : 100,
      skip: skip ? parseInt(skip, 10) : 0
    });

    const total = await aiReportRepository.countByConference(orgId, conferenceId, {
      status,
      flagged: flagged === 'true' ? true : flagged === 'false' ? false : undefined
    });

    return {
      data: reports,
      total,
      limit: limit ? parseInt(limit, 10) : 100,
      skip: skip ? parseInt(skip, 10) : 0
    };
  }

  /**
   * Get queue statistics (admin only)
   */
  async getQueueStatistics() {
    return getQueueStats();
  }
}

module.exports = new AIService();
