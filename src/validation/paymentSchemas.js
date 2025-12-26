const { z } = require('zod');

const paymentWebhookSchema = {
  body: z.object({
    providerRef: z.string().min(1),
    orgId: z.string().regex(/^[a-fA-F0-9]{24}$/, 'orgId must be a valid ObjectId'),
  }),
};

module.exports = {
  paymentWebhookSchema,
};
