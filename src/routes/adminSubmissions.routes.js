const { Router } = require('express');
const { requireRole } = require('../middleware/rbac');
const Roles = require('../constants/roles');
const adminSubmissionController = require('../controllers/adminSubmissionController');
const validate = require('../middleware/validation');
const {
  listAdminSubmissionsSchema,
  adminDecisionSchema,
  adminFinalUploadSchema,
} = require('../validation/adminSubmissionSchemas');

const router = Router();

router.get('/', requireRole([Roles.ADMIN, Roles.SUPER_ADMIN]), validate(listAdminSubmissionsSchema), adminSubmissionController.listSubmissions);
router.post('/:id/decision', requireRole([Roles.ADMIN, Roles.SUPER_ADMIN]), validate(adminDecisionSchema), adminSubmissionController.setDecision);
router.post('/:id/files/final', requireRole([Roles.ADMIN, Roles.SUPER_ADMIN]), validate(adminFinalUploadSchema), adminSubmissionController.uploadFinalFile);

module.exports = router;
