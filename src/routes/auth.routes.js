const { Router } = require('express');
const authController = require('../controllers/authController');
const validate = require('../middleware/validation');
const { loginSchema } = require('../validation/authSchemas');

const router = Router();

router.post('/login', validate(loginSchema), authController.login);

module.exports = router;
