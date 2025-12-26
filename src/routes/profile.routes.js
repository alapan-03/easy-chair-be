const { Router } = require('express');
const { requireRole } = require('../middleware/rbac');
const Roles = require('../constants/roles');
const authorProfileController = require('../controllers/authorProfileController');
const validate = require('../middleware/validation');
const { upsertAuthorProfileSchema } = require('../validation/authorProfileSchemas');

const router = Router();

router.post('/', requireRole([Roles.AUTHOR, Roles.ADMIN, Roles.SUPER_ADMIN]), validate(upsertAuthorProfileSchema), authorProfileController.upsertProfile);
router.get('/', requireRole([Roles.AUTHOR, Roles.ADMIN, Roles.SUPER_ADMIN]), authorProfileController.getProfile);

module.exports = router;
