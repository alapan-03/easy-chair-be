const { z } = require('zod');

const upsertAuthorProfileSchema = {
  body: z.object({
    name: z.string().min(1),
    affiliation: z.string().min(1),
    orcid: z.string().min(1),
    phone: z.string().optional(),
  }),
};

module.exports = {
  upsertAuthorProfileSchema,
};
