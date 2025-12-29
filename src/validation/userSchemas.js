const { z } = require('zod');

const listUsersSchema = {
  query: z.object({
    search: z.string().trim().min(1).max(100).optional(),
  }),
};

module.exports = {
  listUsersSchema,
};
