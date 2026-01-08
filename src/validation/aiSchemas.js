const { z } = require('zod');

const objectId = z.string().regex(/^[a-fA-F0-9]{24}$/, 'Must be a valid ObjectId');

const consentSchema = {
  params: z.object({ id: objectId }),
  body: z.object({
    consentAI: z.boolean(),
    consentFineTune: z.boolean().optional().default(false)
  })
};

const triggerAIAnalysisSchema = {
  params: z.object({ id: objectId })
};

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
