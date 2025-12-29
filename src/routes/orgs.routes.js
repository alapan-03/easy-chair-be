const { Router } = require('express');
const orgController = require('../controllers/orgController');
const validate = require('../middleware/validation');
const { createOrgSchema, addOrgMemberSchema, getOrgMembersSchema } = require('../validation/orgSchemas');
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
router.get(
  '/:orgId/members',
  requireRole([Roles.ADMIN, Roles.AUTHOR, Roles.SUPER_ADMIN], { requireOrg: false }),
  validate(getOrgMembersSchema),
  orgController.getOrgMembers
);

module.exports = router;
