const consentRecordRepository = require('../repositories/consentRecordRepository');
const aiReportRepository = require('../repositories/aiReportRepository');
const submissionRepository = require('../repositories/submissionRepository');
const submissionFileRepository = require('../repositories/submissionFileRepository');
const conferenceSettingsRepository = require('../repositories/conferenceSettingsRepository');
const AIProviderFactory = require('./ai/AIProviderFactory');
const StorageProvider = require('./storageProvider');
const logger = require('../config/logger');
const { NotFoundError, ForbiddenError, BadRequestError } = require('../utils/errors');

// Lazy-load PDF parser to avoid issues if not installed
let pdfParse = null;

class AIService {
  /**
   * Extract text from PDF buffer
   */
  async extractTextFromPDF(pdfBuffer) {
    if (!pdfParse) {
      pdfParse = require('pdf-parse');
    }

    // Enforce size limit (50MB max)
    const maxSizeBytes = 50 * 1024 * 1024;
    if (pdfBuffer.length > maxSizeBytes) {
      throw new Error(`PDF exceeds maximum size of ${maxSizeBytes / 1024 / 1024}MB`);
    }

    const data = await pdfParse(pdfBuffer, { max: 0 });
    return data.text;
  }

  /**
   * Fetch corpus of previous submissions for similarity comparison
   */
  async fetchCorpus(orgId, conferenceId, excludeSubmissionId) {
    try {
      const submissions = await submissionRepository.findByConference(orgId, conferenceId, {
        limit: 50
      });

      const corpus = [];
      for (const submission of submissions) {
        if (submission._id.toString() === excludeSubmissionId) continue;

        const text = `${submission.metadata?.title || ''}\n${submission.metadata?.abstract || ''}`;
        if (text.trim().length > 100) {
          corpus.push(text);
        }
      }

      return corpus;
    } catch (error) {
      logger.error({ error: error.message, conferenceId }, 'Failed to fetch corpus');
      return [];
    }
  }

  /**
   * Capture AI consent from author
   */
  async captureConsent(orgId, submissionId, userId, consentData, metadata = {}) {
    const submission = await submissionRepository.findById(orgId, submissionId);
    if (!submission) {
      throw new NotFoundError('Submission not found');
    }

    if (submission.createdByUserId.toString() !== userId.toString()) {
      throw new ForbiddenError('You can only consent for your own submissions');
    }

    const { consentAI, consentFineTune, ip, userAgent } = consentData;

    const consent = await consentRecordRepository.upsertConsent(
      orgId,
      submission.conferenceId,
      submissionId,
      userId,
      { consentAI, consentFineTune, ip, userAgent },
      metadata
    );

    logger.info({ submissionId, userId, consentAI, consentFineTune }, 'AI consent captured');
    return consent;
  }

  /**
   * Check if user has given AI consent for a submission
   */
  async hasConsent(submissionId, userId) {
    return consentRecordRepository.hasConsent(submissionId, userId);
  }

  /**
   * Run AI analysis synchronously (replaces queue-based approach)
   */
  async runAnalysis(orgId, conferenceId, submissionId, fileVersionId, reportId, settings) {
    let aiConfig = settings.ai || {};

    try {
      // Mark report as RUNNING
      await aiReportRepository.updateStatus(reportId, 'RUNNING');

      // Load submission
      const submission = await submissionRepository.findById(orgId, submissionId);
      if (!submission) throw new Error('Submission not found');

      // Load file metadata
      const file = await submissionFileRepository.findById(orgId, fileVersionId);
      if (!file) throw new Error('File not found');

      // Download PDF
      logger.info({ storageKey: file.storageKey }, 'Downloading PDF from storage');
      const pdfBuffer = await StorageProvider.getObject(file.storageKey);

      // Extract text
      logger.info('Extracting text from PDF');
      const extractedText = await this.extractTextFromPDF(pdfBuffer);

      if (!extractedText || extractedText.length < 100) {
        throw new Error('Insufficient text extracted from PDF');
      }

      // Get provider names (default to gemini now)
      const summarizationProviderName = aiConfig.providers?.summarization?.name || 'gemini';
      const similarityProviderName = aiConfig.providers?.similarity?.name || 'gemini';

      // Resolve providers
      const summarizationProvider = AIProviderFactory.getProvider(summarizationProviderName);
      const similarityProvider = AIProviderFactory.getProvider(similarityProviderName);

      // Generate summary
      logger.info({ provider: summarizationProviderName }, 'Generating AI summary');
      const summary = await summarizationProvider.generateSummary(extractedText, {
        model: aiConfig.providers?.summarization?.model
      });

      // Run format checks
      logger.info('Running format checks');
      const formatCheck = await summarizationProvider.runFormatChecks(extractedText, submission.metadata);

      // Compute similarity
      logger.info({ provider: similarityProviderName }, 'Computing similarity');
      let corpus = await this.fetchCorpus(orgId, conferenceId, submissionId);
      corpus = Array.isArray(corpus) ? corpus.slice(0, 10) : [];

      const similarity = await similarityProvider.computeSimilarity(extractedText, corpus, {
        thresholdPct: aiConfig.plagiarismThresholdPct ?? 20,
        excludeReferences: aiConfig.excludeReferencesToggle !== false,
        model: aiConfig.providers?.similarity?.model
      });

      // Save results
      logger.info('Saving AI report results');
      await aiReportRepository.updateWithResults(reportId, {
        summary,
        formatCheck,
        similarity,
        providerMeta: {
          summarizationProvider: summarizationProviderName,
          similarityProvider: similarityProviderName
        }
      });

      logger.info({ submissionId, reportId }, 'AI analysis completed successfully');

      return {
        success: true,
        reportId,
        summaryPreview: summary.text?.substring(0, 200) + '...',
        similarityScore: similarity.scorePct
      };

    } catch (error) {
      logger.error({ error: error.message, stack: error.stack, submissionId }, 'AI analysis failed');

      let errorCode = 'PROCESSING_ERROR';
      let errorMessage = error.message;

      const providerLabel = (aiConfig?.providers?.summarization?.name || 'AI').toUpperCase();

      if (error.message?.includes('API key') || error.message?.includes('Incorrect API key')) {
        errorCode = 'API_KEY_INVALID';
        errorMessage = `${providerLabel} API key is invalid or missing.`;
      } else if (error.message?.toLowerCase().includes('rate limit')) {
        errorCode = 'RATE_LIMIT_EXCEEDED';
        errorMessage = `${providerLabel} API rate limit exceeded. Please try again later.`;
      } else if (error.message?.toLowerCase().includes('quota')) {
        errorCode = 'QUOTA_EXCEEDED';
        errorMessage = `${providerLabel} API quota exceeded. Please check billing.`;
      }

      await aiReportRepository.markFailed(reportId, errorCode, errorMessage);
      throw error;
    }
  }

  /**
   * Trigger AI analysis (manual or auto) - runs synchronously
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
    const consentRequired = settings.ai?.consentRequired !== false;
    if (consentRequired) {
      const hasConsent = await this.hasConsent(submissionId, submission.createdByUserId);
      if (!hasConsent) {
        throw new ForbiddenError('AI analysis requires author consent');
      }
    }

    // Check run mode
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

    // Run analysis synchronously (no queue)
    try {
      const result = await this.runAnalysis(
        orgId,
        conferenceId,
        submissionId,
        fileVersionId,
        report._id.toString(),
        settings
      );

      logger.info({ submissionId, fileVersionId, reportId: report._id, runMode }, 'AI analysis completed');

      return {
        report: await aiReportRepository.findById(orgId, report._id),
        result
      };
    } catch (error) {
      // Error already logged and saved to report in runAnalysis
      return {
        report: await aiReportRepository.findById(orgId, report._id),
        error: error.message
      };
    }
  }

  /**
   * Get AI report for a submission
   */
  async getReport(orgId, submissionId, fileVersionId = null) {
    if (fileVersionId) {
      return aiReportRepository.findBySubmissionAndFile(orgId, submissionId, fileVersionId);
    }

    const reports = await aiReportRepository.findBySubmission(orgId, submissionId);
    return reports[0] || null;
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
   * Get queue statistics (returns empty stats since queue is disabled)
   */
  async getQueueStatistics() {
    return { waiting: 0, active: 0, completed: 0, failed: 0, disabled: true };
  }
}

module.exports = new AIService();
