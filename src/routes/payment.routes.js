const { Router } = require('express');
const paymentController = require('../controllers/paymentController');
const validate = require('../middleware/validation');
const { paymentWebhookSchema } = require('../validation/paymentSchemas');

const router = Router();

router.post('/payment', validate(paymentWebhookSchema), paymentController.paymentWebhook);

module.exports = router;
