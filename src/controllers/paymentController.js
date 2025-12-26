const config = require('../config');
const { ApiError } = require('../utils/errors');
const paymentService = require('../services/paymentService');

const paymentWebhook = async (req, res) => {
  const sharedSecret = req.headers['x-shared-secret'];
  if (!sharedSecret || sharedSecret !== config.payments.webhookSecret) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Invalid webhook secret');
  }

  const { providerRef, orgId } = req.body;
  if (!providerRef || !orgId) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'providerRef and orgId are required');
  }

  const intent = await paymentService.markPaidByProviderRef(orgId, providerRef);
  res.json({ ok: true, status: intent.status });
};

module.exports = {
  paymentWebhook,
};
