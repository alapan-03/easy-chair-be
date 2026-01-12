const logger = require('../config/logger');

let Queue, Redis, connection, aiAnalysisQueue;
let isRedisEnabled = false;

// Try to initialize Redis if REDIS_HOST is configured
if (process.env.REDIS_HOST) {
  try {
    const { Queue: BullQueue } = require('bullmq');
    const IORedis = require('ioredis');
    Queue = BullQueue;
    Redis = IORedis;

    connection = new Redis({
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT || 6379,
      maxRetriesPerRequest: null
    });

    connection.on('error', (err) => {
      logger.error({ err }, 'Redis connection error');
    });

    connection.on('connect', () => {
      logger.info('Redis connected for BullMQ');
      isRedisEnabled = true;
    });

    // AI Analysis Queue
    aiAnalysisQueue = new Queue('ai-analysis', {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000
        },
        removeOnComplete: {
          count: 100,
          age: 86400 // 24 hours
        },
        removeOnFail: {
          count: 500,
          age: 604800 // 7 days
        }
      }
    });

    isRedisEnabled = true;
    logger.info('BullMQ queue initialized');
  } catch (error) {
    logger.warn({ err: error.message }, 'Redis/BullMQ not available - AI analysis queue disabled');
    isRedisEnabled = false;
  }
} else {
  logger.info('Redis not configured (REDIS_HOST not set) - AI analysis queue disabled');
}

/**
 * Enqueue an AI analysis job
 * Returns null if Redis is not available
 */
async function enqueueAIAnalysis(jobData) {
  if (!isRedisEnabled || !aiAnalysisQueue) {
    logger.warn({ submissionId: jobData?.submissionId }, 'AI analysis skipped - Redis not available');
    return null;
  }

  try {
    const job = await aiAnalysisQueue.add('analyze-submission', jobData, {
      jobId: `ai-${jobData.submissionId}-${jobData.fileVersionId}`,
      priority: jobData.runMode === 'MANUAL' ? 1 : 10
    });

    logger.info({
      jobId: job.id,
      submissionId: jobData.submissionId
    }, 'AI analysis job enqueued');

    return job;
  } catch (error) {
    logger.error({
      error: error.message,
      jobData
    }, 'Failed to enqueue AI analysis job');
    throw error;
  }
}

/**
 * Get queue statistics
 */
async function getQueueStats() {
  if (!isRedisEnabled || !aiAnalysisQueue) {
    return { waiting: 0, active: 0, completed: 0, failed: 0, disabled: true };
  }

  try {
    const [waiting, active, completed, failed] = await Promise.all([
      aiAnalysisQueue.getWaitingCount(),
      aiAnalysisQueue.getActiveCount(),
      aiAnalysisQueue.getCompletedCount(),
      aiAnalysisQueue.getFailedCount()
    ]);

    return { waiting, active, completed, failed };
  } catch (error) {
    logger.error({ error: error.message }, 'Failed to get queue stats');
    throw error;
  }
}

/**
 * Get job status by ID
 */
async function getJobStatus(jobId) {
  if (!isRedisEnabled || !aiAnalysisQueue) {
    return null;
  }

  try {
    const job = await aiAnalysisQueue.getJob(jobId);
    if (!job) {
      return null;
    }

    const state = await job.getState();
    return {
      id: job.id,
      state,
      progress: job.progress,
      data: job.data,
      returnvalue: job.returnvalue,
      failedReason: job.failedReason
    };
  } catch (error) {
    logger.error({ error: error.message, jobId }, 'Failed to get job status');
    throw error;
  }
}

/**
 * Check if Redis/BullMQ is enabled
 */
function isQueueEnabled() {
  return isRedisEnabled;
}

module.exports = {
  aiAnalysisQueue,
  enqueueAIAnalysis,
  getQueueStats,
  getJobStatus,
  isQueueEnabled,
  connection
};
