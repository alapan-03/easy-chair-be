const { Router } = require('express');
const orgController = require('../controllers/orgController');
const validate = require('../middleware/validation');
const { createOrgSchema } = require('../validation/orgSchemas');
const { requireRole } = require('../middleware/rbac');
const Roles = require('../constants/roles');

const router = Router();

router.post('/', requireRole([Roles.SUPER_ADMIN], { requireOrg: false }), validate(createOrgSchema), orgController.createOrganization);

router.get('/me', orgController.getMyOrganizations);

module.exports = router;
