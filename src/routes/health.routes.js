const { Router } = require('express');
const healthController = require('../controllers/healthController');

const router = Router();

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check API
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is healthy
 */
router.get('/', healthController.healthcheck);

module.exports = router;
