const { Router } = require('express');
const healthController = require('../controllers/healthController');

const router = Router();

router.get('/', healthController.healthcheck);

module.exports = router;
