const { z } = require('zod');

const consentSchema = z.object({
  consentAI: z.boolean(),
  consentFineTune: z.boolean().optional().default(false)
});

const triggerAIAnalysisSchema = z.object({});

const listAIReportsQuerySchema = z.object({
  status: z.enum(['QUEUED', 'RUNNING', 'DONE', 'FAILED']).optional(),
  flagged: z.enum(['true', 'false']).optional(),
  limit: z.string().regex(/^\d+$/).optional(),
  skip: z.string().regex(/^\d+$/).optional()
});

module.exports = {
  consentSchema,
  triggerAIAnalysisSchema,
  listAIReportsQuerySchema
};
