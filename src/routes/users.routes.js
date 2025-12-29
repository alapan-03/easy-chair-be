const { Router } = require('express');
const validate = require('../middleware/validation');
const { listUsersSchema } = require('../validation/userSchemas');
const userController = require('../controllers/userController');

const router = Router();

router.get('/', validate(listUsersSchema), userController.listUsers);

module.exports = router;
