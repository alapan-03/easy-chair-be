const { z } = require('zod');

const createTrackSchema = {
  body: z.object({
    conferenceId: z.string().min(1),
    name: z.string().min(1),
    code: z.string().min(1),
    status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  }),
};

const listTrackSchema = {
  query: z.object({
    conferenceId: z.string().min(1, 'conferenceId is required'),
  }),
};

module.exports = {
  createTrackSchema,
  listTrackSchema,
};
