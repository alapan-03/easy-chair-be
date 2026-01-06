require('dotenv').config();
require('express-async-errors');

const { Worker } = require('bullmq');
const pdfParse = require('pdf-parse');
const { connection } = require('../services/queueService');
const logger = require('../config/logger');
const connectDB = require('../database/mongoose');

// Repositories
const aiReportRepository = require('../repositories/aiReportRepository');
const submissionRepository = require('../repositories/submissionRepository');
const submissionFileRepository = require('../repositories/submissionFileRepository');
const conferenceSettingsRepository = require('../repositories/conferenceSettingsRepository');

// AI Providers
const AIProviderFactory = require('../services/ai/AIProviderFactory');

// Storage Provider
const StorageProvider = require('../services/storageProvider');

/**
 * Extract text from PDF buffer
 * @param {Buffer} pdfBuffer
 * @returns {Promise<string>}
 */
async function extractTextFromPDF(pdfBuffer) {
  try {
    // Enforce size limit (50MB max)
    const maxSizeBytes = 50 * 1024 * 1024;
    if (pdfBuffer.length > maxSizeBytes) {
      throw new Error(`PDF exceeds maximum size of ${maxSizeBytes / 1024 / 1024}MB`);
    }

    const data = await pdfParse(pdfBuffer, {
      max: 0 // Parse all pages
    });

    return data.text;
  } catch (error) {
    logger.error({ error: error.message }, 'PDF text extraction failed');
    throw error;
  }
}

/**
 * Fetch corpus of previous submissions for similarity comparison
 * @param {string} orgId
 * @param {string} conferenceId
 * @param {string} excludeSubmissionId - Don't include the current submission
 * @returns {Promise<Array<string>>}
 */
async function fetchCorpus(orgId, conferenceId, excludeSubmissionId) {
  try {
    // Get all previous submissions in this conference
    const submissions = await submissionRepository.findByConference(orgId, conferenceId, {
      limit: 50 // Limit corpus size for performance
    });

    const corpus = [];

    for (const submission of submissions) {
      // Skip the current submission
      if (submission._id.toString() === excludeSubmissionId) {
        continue;
      }

      // Get the latest file for this submission
      const files = await submissionFileRepository.findBySubmission(orgId, submission._id);
      if (files.length === 0) continue;

      const latestFile = files[files.length - 1];

      // For now, we'll just use the abstract + title as a lightweight corpus
      // In production, you'd extract full text from stored PDFs
      const text = `${submission.metadata?.title || ''}\n${submission.metadata?.abstract || ''}`;
      if (text.trim().length > 100) {
        corpus.push(text);
      }
    }

    return corpus;
  } catch (error) {
    logger.error({ error: error.message, conferenceId }, 'Failed to fetch corpus');
    return []; // Return empty corpus on error
  }
}

/**
 * Process AI analysis job
 */
async function processAIAnalysis(job) {
  const { 
    orgId, 
    conferenceId, 
    submissionId, 
    fileVersionId,
    reportId
  } = job.data;

  logger.info({ 
    jobId: job.id, 
    submissionId, 
    fileVersionId 
  }, 'Processing AI analysis job');

  try {
    // Update report status to RUNNING
    await aiReportRepository.updateStatus(reportId, 'RUNNING');

    // 1. Load submission and file metadata
    const submission = await submissionRepository.findById(orgId, submissionId);
    if (!submission) {
      throw new Error('Submission not found');
    }

    const file = await submissionFileRepository.findById(orgId, fileVersionId);
    if (!file) {
      throw new Error('File not found');
    }

    // 2. Download PDF from storage
    logger.info({ storageKey: file.storageKey }, 'Downloading PDF from storage');
    const pdfBuffer = await StorageProvider.getObject(file.storageKey);

    // 3. Extract text from PDF
    job.updateProgress(20);
    logger.info('Extracting text from PDF');
    const extractedText = await extractTextFromPDF(pdfBuffer);

    if (!extractedText || extractedText.length < 100) {
      throw new Error('Insufficient text extracted from PDF');
    }

    // 4. Load conference settings
    const settings = await conferenceSettingsRepository.findByConference(orgId, conferenceId);
    if (!settings) {
      throw new Error('Conference settings not found');
    }

    const aiConfig = settings.ai || {};
    const providerName = aiConfig.providers?.summarization?.name || 'openai';
    const similarityProviderName = aiConfig.providers?.similarity?.name || 'openai';

    // 5. Get AI provider
    const provider = AIProviderFactory.getProvider(providerName);

    // 6. Generate summary
    job.updateProgress(40);
    logger.info('Generating AI summary');
    const summary = await provider.generateSummary(extractedText, {
      model: aiConfig.providers?.summarization?.model
    });

    // 7. Run format checks
    job.updateProgress(60);
    logger.info('Running format checks');
    const formatCheck = await provider.runFormatChecks(extractedText, submission.metadata);

    // 8. Compute similarity
    job.updateProgress(80);
    logger.info('Computing similarity');
    const corpus = await fetchCorpus(orgId, conferenceId, submissionId);
    const similarity = await provider.computeSimilarity(extractedText, corpus, {
      thresholdPct: aiConfig.plagiarismThresholdPct || 20,
      excludeReferences: aiConfig.excludeReferencesToggle !== false,
      model: aiConfig.providers?.similarity?.model
    });

    // 9. Update report with results
    job.updateProgress(95);
    logger.info('Saving AI report results');
    await aiReportRepository.updateWithResults(reportId, {
      summary,
      formatCheck,
      similarity,
      providerMeta: {
        provider: providerName,
        model: aiConfig.providers?.summarization?.model
      }
    });

    job.updateProgress(100);
    logger.info({ 
      jobId: job.id, 
      submissionId, 
      reportId 
    }, 'AI analysis job completed successfully');

    return { 
      success: true, 
      reportId,
      summary: summary.text.substring(0, 200) + '...',
      similarity: similarity.scorePct
    };

  } catch (error) {
    logger.error({ 
      error: error.message, 
      stack: error.stack,
      jobId: job.id, 
      submissionId 
    }, 'AI analysis job failed');

    // Determine error code
    let errorCode = 'PROCESSING_ERROR';
    let errorMessage = error.message;

    if (error.message?.includes('API key') || error.message?.includes('Incorrect API key')) {
      errorCode = 'API_KEY_INVALID';
      errorMessage = 'OpenAI API key is invalid or missing. Please configure OPENAI_API_KEY.';
    } else if (error.message?.includes('rate limit')) {
      errorCode = 'RATE_LIMIT_EXCEEDED';
      errorMessage = 'OpenAI API rate limit exceeded. Please try again later.';
    } else if (error.message?.includes('quota')) {
      errorCode = 'QUOTA_EXCEEDED';
      errorMessage = 'OpenAI API quota exceeded. Please check your billing.';
    }

    // Mark report as failed
    await aiReportRepository.markFailed(reportId, errorCode, errorMessage);

    throw error;
  }
}

/**
 * Start the worker
 */
async function startWorker() {
  try {
    // Connect to MongoDB
    await connectDB();
    logger.info('Worker connected to MongoDB');

    // Create worker
    const worker = new Worker('ai-analysis', processAIAnalysis, {
      connection,
      concurrency: parseInt(process.env.AI_WORKER_CONCURRENCY || '2', 10),
      limiter: {
        max: 10, // Max 10 jobs
        duration: 60000 // per minute
      }
    });

    worker.on('completed', (job) => {
      logger.info({ jobId: job.id }, 'Job completed');
    });

    worker.on('failed', (job, err) => {
      logger.error({ jobId: job?.id, error: err.message }, 'Job failed');
    });

    worker.on('error', (err) => {
      logger.error({ error: err.message }, 'Worker error');
    });

    logger.info('AI worker started successfully');

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      logger.info('SIGTERM received, closing worker');
      await worker.close();
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      logger.info('SIGINT received, closing worker');
      await worker.close();
      process.exit(0);
    });

  } catch (error) {
    logger.error({ error: error.message }, 'Failed to start worker');
    process.exit(1);
  }
}

// Start worker if this file is run directly
if (require.main === module) {
  startWorker();
}

module.exports = { startWorker, processAIAnalysis };
