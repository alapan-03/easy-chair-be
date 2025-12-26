const { z } = require('zod');

const createConferenceSchema = {
  body: z.object({
    name: z.string().min(1, 'name is required'),
    slug: z.string().regex(/^[a-z0-9-]+$/, 'slug must be lowercase alphanumerics and hyphens').optional(),
    status: z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']).optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  }),
};

module.exports = {
  createConferenceSchema,
};
