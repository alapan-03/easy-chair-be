const { Router } = require('express');
const orgController = require('../controllers/orgController');
const validate = require('../middleware/validation');
const { createOrgSchema, addOrgMemberSchema } = require('../validation/orgSchemas');
const { requireRole } = require('../middleware/rbac');
const Roles = require('../constants/roles');

const router = Router();

router.post('/', requireRole([Roles.SUPER_ADMIN], { requireOrg: false }), validate(createOrgSchema), orgController.createOrganization);

router.get('/me', orgController.getMyOrganizations);
router.post(
  '/:orgId/members',
  requireRole([Roles.ADMIN, Roles.SUPER_ADMIN], { requireOrg: false }),
  validate(addOrgMemberSchema),
  orgController.addOrgMember
);

module.exports = router;
