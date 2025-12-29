const { z } = require('zod');

const objectId = z.string().regex(/^[a-fA-F0-9]{24}$/, 'Must be a valid ObjectId');

const submissionRulesSchema = z
  .object({
    maxFileSizeMb: z.number().positive().optional(),
    allowedTypes: z.array(z.string().min(1)).optional(),
    allowAuthorRevisionAfterSubmit: z.boolean().optional(),
    allowAdminUploadFinal: z.boolean().optional(),
  })
  .optional();

const paymentsSchema = z
  .object({
    requiredBeforeSubmit: z.boolean().optional(),
    currency: z.string().min(1).optional(),
    amountCents: z.number().int().nonnegative().optional(),
    refundPolicy: z.string().optional(),
  })
  .optional();

const aiSchema = z
  .object({
    enabled: z.boolean().optional(),
    visibility: z.enum(['admin_only', 'author_visible']).optional(),
    runMode: z.enum(['both', 'plagiarism_only', 'assist_only']).optional(),
    plagiarismThresholdPct: z.number().min(0).max(100).optional(),
    excludeReferencesToggle: z.boolean().optional(),
  })
  .optional();

const certificatesSchema = z
  .object({
    manualOnly: z.boolean().optional(),
    delivery: z.array(z.string().min(1)).optional(),
  })
  .optional();

const upsertConferenceSettingsSchema = {
  params: z.object({
    conferenceId: objectId,
  }),
  body: z.object({
    maxFileSize: z.number().int().positive().optional(),
    allowedFileTypes: z.array(z.string().min(1)).optional(),
    submissionRules: submissionRulesSchema,
    decisionStatuses: z.array(z.string().min(1)).optional(),
    payments: paymentsSchema,
    ai: aiSchema,
    certificates: certificatesSchema,
  }),
};

module.exports = {
  upsertConferenceSettingsSchema,
};
