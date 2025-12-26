const { Router } = require('express');
const trackController = require('../controllers/trackController');
const { requireRole } = require('../middleware/rbac');
const validate = require('../middleware/validation');
const { createTrackSchema, listTrackSchema } = require('../validation/trackSchemas');
const Roles = require('../constants/roles');

const router = Router();

router.post('/', requireRole([Roles.ADMIN, Roles.SUPER_ADMIN]), validate(createTrackSchema), trackController.createTrack);
router.get('/', requireRole([Roles.ADMIN, Roles.AUTHOR, Roles.SUPER_ADMIN]), validate(listTrackSchema), trackController.listTracks);

module.exports = router;
