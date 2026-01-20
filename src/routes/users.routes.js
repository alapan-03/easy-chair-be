const { Router } = require('express');
const validate = require('../middleware/validation');
const { listUsersSchema } = require('../validation/userSchemas');
const userController = require('../controllers/userController');

const router = Router();

/**
 * @swagger
 * /users:
 *   get:
 *     summary: List users
 *     tags: [List Users]
 *     responses:
 *       200:
 */
router.get('/', validate(listUsersSchema), userController.listUsers);

router.get('/conferences', userController.getAllUsersConferences)

module.exports = router;
