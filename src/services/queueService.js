const { Queue } = require('bullmq');
const Redis = require('ioredis');
const config = require('../config');
const logger = require('../config/logger');

// Redis connection
const connection = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  maxRetriesPerRequest: null
});

connection.on('error', (err) => {
  logger.error({ err }, 'Redis connection error');
});

connection.on('connect', () => {
  logger.info('Redis connected for BullMQ');
});

// AI Analysis Queue
const aiAnalysisQueue = new Queue('ai-analysis', {
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

/**
 * Enqueue an AI analysis job
 * @param {Object} jobData
 * @param {string} jobData.orgId
 * @param {string} jobData.conferenceId
 * @param {string} jobData.submissionId
 * @param {string} jobData.fileVersionId
 * @param {string} jobData.runMode - 'AUTO' or 'MANUAL'
 * @param {string} jobData.triggeredByUserId - null for AUTO
 * @param {string} jobData.reportId - AIReport document ID
 */
async function enqueueAIAnalysis(jobData) {
  try {
    const job = await aiAnalysisQueue.add('analyze-submission', jobData, {
      jobId: `ai-${jobData.submissionId}-${jobData.fileVersionId}`,
      priority: jobData.runMode === 'MANUAL' ? 1 : 10 // Manual jobs get higher priority
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
  try {
    const [waiting, active, completed, failed] = await Promise.all([
      aiAnalysisQueue.getWaitingCount(),
      aiAnalysisQueue.getActiveCount(),
      aiAnalysisQueue.getCompletedCount(),
      aiAnalysisQueue.getFailedCount()
    ]);

    return {
      waiting,
      active,
      completed,
      failed
    };
  } catch (error) {
    logger.error({ error: error.message }, 'Failed to get queue stats');
    throw error;
  }
}

/**
 * Get job status by ID
 */
async function getJobStatus(jobId) {
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

module.exports = {
  aiAnalysisQueue,
  enqueueAIAnalysis,
  getQueueStats,
  getJobStatus,
  connection
};
