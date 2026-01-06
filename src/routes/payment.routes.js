const { Router } = require('express');
const paymentController = require('../controllers/paymentController');
const validate = require('../middleware/validation');
const { paymentWebhookSchema } = require('../validation/paymentSchemas');

const router = Router();

/**
 * @swagger
 * /webhooks/payment:
 *   post:
 *     summary: Payment Webhook
 *     tags: [Payment]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - providerRef
 *               - orgId
 *             properties:
 *               providerRef:
 *                 type: string
 *               orgId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Payment completed
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Admin only)
 */
router.post('/payment', validate(paymentWebhookSchema), paymentController.paymentWebhook);

module.exports = router;
