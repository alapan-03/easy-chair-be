const { Router } = require('express');
const { requireRole } = require('../middleware/rbac');
const Roles = require('../constants/roles');
const submissionController = require('../controllers/submissionController');
const validate = require('../middleware/validation');
const {
  createSubmissionSchema,
  updateSubmissionSchema,
  uploadFileSchema,
  idOnlySchema,
} = require('../validation/submissionSchemas');

const router = Router();

router.post('/', requireRole([Roles.AUTHOR, Roles.ADMIN, Roles.SUPER_ADMIN]), validate(createSubmissionSchema), submissionController.createSubmission);
router.patch('/:id', requireRole([Roles.AUTHOR, Roles.ADMIN, Roles.SUPER_ADMIN]), validate(updateSubmissionSchema), submissionController.updateSubmission);
router.post('/:id/files', requireRole([Roles.AUTHOR, Roles.ADMIN, Roles.SUPER_ADMIN]), validate(uploadFileSchema), submissionController.uploadSubmissionFile);
router.post('/:id/payment-intent', requireRole([Roles.AUTHOR, Roles.ADMIN, Roles.SUPER_ADMIN]), validate(idOnlySchema), submissionController.createPaymentIntent);
router.post('/:id/submit', requireRole([Roles.AUTHOR, Roles.ADMIN, Roles.SUPER_ADMIN]), validate(idOnlySchema), submissionController.submit);
router.get('/', requireRole([Roles.AUTHOR, Roles.ADMIN, Roles.SUPER_ADMIN]), submissionController.listMySubmissions);
router.get('/:id', requireRole([Roles.AUTHOR, Roles.ADMIN, Roles.SUPER_ADMIN]), validate(idOnlySchema), submissionController.getSubmissionDetails);

module.exports = router;
