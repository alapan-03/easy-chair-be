const { Router } = require('express');
const { requireRole } = require('../middleware/rbac');
const Roles = require('../constants/roles');
const submissionController = require('../controllers/submissionController');
const aiController = require('../controllers/aiController');
const validate = require('../middleware/validation');
const {
  createSubmissionSchema,
  updateSubmissionSchema,
  uploadFileSchema,
  idOnlySchema,
} = require('../validation/submissionSchemas');
const { consentSchema } = require('../validation/aiSchemas');

const router = Router();

router.post('/', requireRole([Roles.AUTHOR, Roles.ADMIN, Roles.SUPER_ADMIN]), validate(createSubmissionSchema), submissionController.createSubmission);
router.patch('/:id', requireRole([Roles.AUTHOR, Roles.ADMIN, Roles.SUPER_ADMIN]), validate(updateSubmissionSchema), submissionController.updateSubmission);
router.post('/:id/files', requireRole([Roles.AUTHOR, Roles.ADMIN, Roles.SUPER_ADMIN]), validate(uploadFileSchema), submissionController.uploadSubmissionFile);
router.post('/:id/payment-intent', requireRole([Roles.AUTHOR, Roles.ADMIN, Roles.SUPER_ADMIN]), validate(idOnlySchema), submissionController.createPaymentIntent);
router.post('/:id/submit', requireRole([Roles.AUTHOR, Roles.ADMIN, Roles.SUPER_ADMIN]), validate(idOnlySchema), submissionController.submit);
router.post('/:id/ai-consent', requireRole([Roles.AUTHOR, Roles.ADMIN, Roles.SUPER_ADMIN]), validate(consentSchema), aiController.captureConsent);
router.get('/', requireRole([Roles.AUTHOR, Roles.ADMIN, Roles.SUPER_ADMIN]), submissionController.listMySubmissions);
router.get('/:id', requireRole([Roles.AUTHOR, Roles.ADMIN, Roles.SUPER_ADMIN]), validate(idOnlySchema), submissionController.getSubmissionDetails);

module.exports = router;
