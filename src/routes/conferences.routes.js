const { Router } = require('express');
const conferenceController = require('../controllers/conferenceController');
const { requireRole } = require('../middleware/rbac');
const validate = require('../middleware/validation');
const { createConferenceSchema } = require('../validation/conferenceSchemas');
const { upsertConferenceSettingsSchema } = require('../validation/conferenceSettingsSchemas');
const Roles = require('../constants/roles');

const router = Router();

router.post('/', requireRole([Roles.ADMIN, Roles.SUPER_ADMIN]), validate(createConferenceSchema), conferenceController.createConference);
router.get('/', requireRole([Roles.ADMIN, Roles.AUTHOR, Roles.SUPER_ADMIN]), conferenceController.listConferences);
router.post(
  '/:conferenceId/settings',
  requireRole([Roles.ADMIN, Roles.SUPER_ADMIN]),
  validate(upsertConferenceSettingsSchema),
  conferenceController.upsertConferenceSettings
);

module.exports = router;
