require("dotenv").config();
require("express-async-errors");

const logger = require("../config/logger");
const connectDB = require("../database/mongoose");

// Check if Redis/BullMQ is available
const { isQueueEnabled, connection } = require("../services/queueService");

if (!isQueueEnabled()) {
  logger.info("AI Worker not started - Redis/BullMQ not configured");
  process.exit(0);
}

// Only load BullMQ if Redis is enabled
const { Worker } = require("bullmq");
const pdfParse = require("pdf-parse");

// Repositories
const aiReportRepository = require("../repositories/aiReportRepository");
const submissionRepository = require("../repositories/submissionRepository");
const submissionFileRepository = require("../repositories/submissionFileRepository");
const conferenceSettingsRepository = require("../repositories/conferenceSettingsRepository");

// AI Providers
const AIProviderFactory = require("../services/ai/AIProviderFactory");

// Storage Provider
const StorageProvider = require("../services/storageProvider");

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
      throw new Error(
        `PDF exceeds maximum size of ${maxSizeBytes / 1024 / 1024}MB`
      );
    }

    const data = await pdfParse(pdfBuffer, {
      max: 0, // Parse all pages
    });

    return data.text;
  } catch (error) {
    logger.error({ error: error.message }, "PDF text extraction failed");
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
    const submissions = await submissionRepository.findByConference(
      orgId,
      conferenceId,
      {
        limit: 50, // Limit corpus size for performance
      }
    );

    const corpus = [];

    for (const submission of submissions) {
      // Skip the current submission
      if (submission._id.toString() === excludeSubmissionId) {
        continue;
      }

      // Get the latest file for this submission
      const files = await submissionFileRepository.findBySubmission(
        orgId,
        submission._id
      );
      if (files.length === 0) continue;

      const latestFile = files[files.length - 1];

      // For now, we'll just use the abstract + title as a lightweight corpus
      // In production, you'd extract full text from stored PDFs
      const text = `${submission.metadata?.title || ""}\n${submission.metadata?.abstract || ""
        }`;
      if (text.trim().length > 100) {
        corpus.push(text);
      }
    }

    return corpus;
  } catch (error) {
    logger.error(
      { error: error.message, conferenceId },
      "Failed to fetch corpus"
    );
    return []; // Return empty corpus on error
  }
}

/**
 * Process AI analysis job
 */
async function processAIAnalysis(job) {
  const { orgId, conferenceId, submissionId, fileVersionId, reportId } =
    job.data;

  logger.info(
    { jobId: job.id, submissionId, fileVersionId },
    "Processing AI analysis job"
  );

  let aiConfig = {};

  try {
    // 0. Mark report as RUNNING
    await aiReportRepository.updateStatus(reportId, "RUNNING");

    // 1. Load submission
    const submission = await submissionRepository.findById(orgId, submissionId);
    if (!submission) {
      throw new Error("Submission not found");
    }

    // 2. Load file metadata
    const file = await submissionFileRepository.findById(orgId, fileVersionId);
    if (!file) {
      throw new Error("File not found");
    }

    // 3. Download PDF
    logger.info(
      { storageKey: file.storageKey },
      "Downloading PDF from storage"
    );
    const pdfBuffer = await StorageProvider.getObject(file.storageKey);

    // 4. Extract text
    job.updateProgress(20);
    logger.info("Extracting text from PDF");
    const extractedText = await extractTextFromPDF(pdfBuffer);

    if (!extractedText || extractedText.length < 100) {
      throw new Error("Insufficient text extracted from PDF");
    }

    // 5. Load conference AI settings
    const settings = await conferenceSettingsRepository.findByConference(
      orgId,
      conferenceId
    );

    if (!settings) {
      throw new Error("Conference settings not found");
    }

    aiConfig = settings.ai || {};

    const summarizationProviderName =
      aiConfig.providers?.summarization?.name || "openai";

    const similarityProviderName =
      aiConfig.providers?.similarity?.name || "openai";

    // 6. Resolve providers
    const summarizationProvider = AIProviderFactory.getProvider(
      summarizationProviderName
    );

    const similarityProvider = AIProviderFactory.getProvider(
      similarityProviderName
    );

    // 7. Generate summary
    job.updateProgress(40);
    logger.info(
      { provider: summarizationProviderName },
      "Generating AI summary"
    );

    const summary = await summarizationProvider.generateSummary(extractedText, {
      model: aiConfig.providers?.summarization?.model,
    });

    // 8. Run format checks (provider-agnostic)
    job.updateProgress(60);
    logger.info("Running format checks");

    const formatCheck = await summarizationProvider.runFormatChecks(
      extractedText,
      submission.metadata
    );

    // 9. Compute similarity
    job.updateProgress(80);
    logger.info({ provider: similarityProviderName }, "Computing similarity");

    let corpus = await fetchCorpus(orgId, conferenceId, submissionId);

    // Defensive limit to avoid token explosion
    corpus = Array.isArray(corpus) ? corpus.slice(0, 10) : [];

    const similarity = await similarityProvider.computeSimilarity(
      extractedText,
      corpus,
      {
        thresholdPct: aiConfig.plagiarismThresholdPct ?? 20,
        excludeReferences: aiConfig.excludeReferencesToggle !== false,
        model: aiConfig.providers?.similarity?.model,
      }
    );

    // 10. Save report results
    job.updateProgress(95);
    logger.info("Saving AI report results");

    await aiReportRepository.updateWithResults(reportId, {
      summary,
      formatCheck,
      similarity,
      providerMeta: {
        summarizationProvider: summarizationProviderName,
        similarityProvider: similarityProviderName,
        summarizationModel: aiConfig.providers?.summarization?.model,
        similarityModel: aiConfig.providers?.similarity?.model,
      },
    });

    job.updateProgress(100);
    logger.info(
      { jobId: job.id, submissionId, reportId },
      "AI analysis job completed successfully"
    );

    return {
      success: true,
      reportId,
      summaryPreview: summary.text?.substring(0, 200) + "...",
      similarityScore: similarity.scorePct,
    };
  } catch (error) {
    logger.error(
      {
        error: error.message,
        stack: error.stack,
        jobId: job.id,
        submissionId,
      },
      "AI analysis job failed"
    );

    let errorCode = "PROCESSING_ERROR";
    let errorMessage = error.message;

    const providerLabel = (
      aiConfig?.providers?.summarization?.name || "AI"
    ).toUpperCase();

    if (
      error.message?.includes("API key") ||
      error.message?.includes("Incorrect API key")
    ) {
      errorCode = "API_KEY_INVALID";
      errorMessage = `${providerLabel} API key is invalid or missing.`;
    } else if (error.message?.toLowerCase().includes("rate limit")) {
      errorCode = "RATE_LIMIT_EXCEEDED";
      errorMessage = `${providerLabel} API rate limit exceeded. Please try again later.`;
    } else if (error.message?.toLowerCase().includes("quota")) {
      errorCode = "QUOTA_EXCEEDED";
      errorMessage = `${providerLabel} API quota exceeded. Please check billing.`;
    }

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
    logger.info("Worker connected to MongoDB");

    // Create worker
    const worker = new Worker("ai-analysis", processAIAnalysis, {
      connection,
      concurrency: parseInt(process.env.AI_WORKER_CONCURRENCY || "2", 10),
      limiter: {
        max: 10, // Max 10 jobs
        duration: 60000, // per minute
      },
    });

    worker.on("completed", (job) => {
      logger.info({ jobId: job.id }, "Job completed");
    });

    worker.on("failed", (job, err) => {
      logger.error({ jobId: job?.id, error: err.message }, "Job failed");
    });

    worker.on("error", (err) => {
      logger.error({ error: err.message }, "Worker error");
    });

    logger.info("AI worker started successfully");

    // Graceful shutdown
    process.on("SIGTERM", async () => {
      logger.info("SIGTERM received, closing worker");
      await worker.close();
      process.exit(0);
    });

    process.on("SIGINT", async () => {
      logger.info("SIGINT received, closing worker");
      await worker.close();
      process.exit(0);
    });
  } catch (error) {
    logger.error({ error: error.message }, "Failed to start worker");
    process.exit(1);
  }
}

// Start worker if this file is run directly
if (require.main === module) {
  startWorker();
}

module.exports = { startWorker, processAIAnalysis };
