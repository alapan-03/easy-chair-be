const aiService = require('../services/aiService');
const logger = require('../config/logger');

class AIController {
  /**
   * POST /submissions/:id/ai-consent
   * Author captures consent for AI analysis
   */
  async captureConsent(req, res) {
    const { id: submissionId } = req.params;
    const userId = req.user.userId;
    const orgId = req.tenant.orgId;

    const { consentAI, consentFineTune } = req.body;
    const ip = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('user-agent');

    const consent = await aiService.captureConsent(
      orgId,
      submissionId,
      userId,
      { consentAI, consentFineTune, ip, userAgent }
    );

    res.json(consent);
  }

  /**
   * POST /admin/submissions/:id/ai/run
   * Admin manually triggers AI analysis
   */
  async triggerAnalysis(req, res) {
    const { id: submissionId } = req.params;
    const orgId = req.tenant.orgId;
    const userId = req.user.userId;

    // Load submission to get conferenceId and latest file
    const submissionRepository = require('../repositories/submissionRepository');
    const submissionFileRepository = require('../repositories/submissionFileRepository');

    const submission = await submissionRepository.findById(orgId, submissionId);
    if (!submission) {
      return res.status(404).json({
        code: 'SUBMISSION_NOT_FOUND',
        message: 'Submission not found'
      });
    }

    // Get latest file
    const files = await submissionFileRepository.findBySubmission(orgId, submissionId);
    if (files.length === 0) {
      return res.status(400).json({
        code: 'NO_FILE_FOUND',
        message: 'No files found for this submission'
      });
    }

    const latestFile = files[files.length - 1];

    const result = await aiService.triggerAnalysis(
      orgId,
      submission.conferenceId,
      submissionId,
      latestFile._id,
      'MANUAL',
      userId
    );

    if (!result) {
      return res.status(400).json({
        code: 'AI_ANALYSIS_SKIPPED',
        message: 'AI analysis was skipped based on conference settings'
      });
    }

    logger.info({
      submissionId,
      triggeredBy: userId,
      reportId: result.report._id
    }, 'Admin triggered AI analysis');

    res.json({
      message: result.error ? 'AI analysis failed' : 'AI analysis completed',
      report: result.report,
      error: result.error || undefined
    });
  }

  /**
   * GET /admin/submissions/:id/ai
   * Get AI report for a submission
   */
  async getReport(req, res) {
    const { id: submissionId } = req.params;
    const orgId = req.tenant.orgId;

    const report = await aiService.getReport(orgId, submissionId);

    if (!report) {
      return res.status(404).json({
        code: 'REPORT_NOT_FOUND',
        message: 'No AI report found for this submission'
      });
    }

    res.json(report);
  }

  /**
   * GET /admin/ai/reports
   * List AI reports with filters
   */
  async listReports(req, res) {
    const orgId = req.tenant.orgId;
    const { conferenceId, status, flagged, limit, skip } = req.query;

    if (!conferenceId) {
      return res.status(400).json({
        code: 'CONFERENCE_ID_REQUIRED',
        message: 'conferenceId query parameter is required'
      });
    }

    const result = await aiService.listReports(orgId, conferenceId, {
      status,
      flagged,
      limit,
      skip
    });

    res.json(result);
  }

  /**
   * GET /admin/ai/queue-stats
   * Get queue statistics
   */
  async getQueueStats(req, res) {
    const stats = await aiService.getQueueStatistics();
    res.json(stats);
  }
}

module.exports = new AIController();
