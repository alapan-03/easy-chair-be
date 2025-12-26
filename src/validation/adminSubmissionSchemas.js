const { z } = require('zod');
const { SubmissionStatuses } = require('../constants/submissionStatuses');

const objectId = z.string().regex(/^[a-fA-F0-9]{24}$/, 'Must be a valid ObjectId');

const listAdminSubmissionsSchema = {
  query: z.object({
    conferenceId: objectId.optional(),
    trackId: objectId.optional(),
    status: z.enum(Object.values(SubmissionStatuses)).optional(),
  }),
};

const adminDecisionSchema = {
  params: z.object({ id: objectId }),
  body: z.object({
    status: z.string().min(1),
    notes: z.string().optional(),
  }),
};

const adminFinalUploadSchema = {
  params: z.object({ id: objectId }),
  body: z.object({
    originalName: z.string().min(1),
    mimeType: z.string().min(1),
    sizeBytes: z.number().int().positive(),
    checksum: z.string().optional(),
  }),
};

module.exports = {
  listAdminSubmissionsSchema,
  adminDecisionSchema,
  adminFinalUploadSchema,
};
