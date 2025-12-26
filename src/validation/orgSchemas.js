const { z } = require('zod');

const createOrgSchema = {
  body: z.object({
    name: z.string().min(1, 'name is required'),
    slug: z.string().regex(/^[a-z0-9-]+$/, 'slug must be lowercase alphanumerics and hyphens').optional(),
  }),
};

module.exports = {
  createOrgSchema,
};
