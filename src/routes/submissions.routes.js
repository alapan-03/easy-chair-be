const { Router } = require("express");
const { requireRole } = require("../middleware/rbac");
const Roles = require("../constants/roles");
const submissionController = require("../controllers/submissionController");
const aiController = require("../controllers/aiController");
const validate = require("../middleware/validation");
const upload = require("../middleware/upload");
const {
  createSubmissionSchema,
  updateSubmissionSchema,
  uploadFileSchema,
  idOnlySchema,
} = require("../validation/submissionSchemas");
const { consentSchema } = require("../validation/aiSchemas");

const router = Router();

/**
 * @swagger
 * /submissions:
 *   post:
 *     summary: Create a new submission draft
 *     tags: [Submissions]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateSubmissionRequest'
 *     responses:
 *       201:
 *         description: Submission draft created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Submission'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.post(
  "/",
  requireRole([Roles.AUTHOR, Roles.ADMIN, Roles.SUPER_ADMIN]),
  validate(createSubmissionSchema),
  submissionController.createSubmission
);

/**
 * @swagger
 * /submissions/{id}:
 *   patch:
 *     summary: Update submission draft metadata
 *     tags: [Submissions]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[a-fA-F0-9]{24}$'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateSubmissionRequest'
 *     responses:
 *       200:
 *         description: Submission updated
 *       400:
 *         description: Validation error
 */
router.patch(
  "/:id",
  requireRole([Roles.AUTHOR, Roles.ADMIN, Roles.SUPER_ADMIN]),
  validate(updateSubmissionSchema),
  submissionController.updateSubmission
);

/**
 * @swagger
 * /submissions/{id}/files:
 *   post:
 *     summary: Upload a PDF file for a submission
 *     tags: [Submissions]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: File uploaded successfully
 */
router.post(
  "/:id/files",
  requireRole([Roles.AUTHOR, Roles.ADMIN, Roles.SUPER_ADMIN]),
  upload.single('file'),
  submissionController.uploadSubmissionFile
);

/**
 * @swagger
 * /submissions/{id}/payment-intent:
 *   post:
 *     summary: Create payment intent for submission
 *     tags: [Submissions]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       201:
 *         description: Payment intent created
 */
router.post(
  "/:id/payment-intent",
  requireRole([Roles.AUTHOR, Roles.ADMIN, Roles.SUPER_ADMIN]),
  validate(idOnlySchema),
  submissionController.createPaymentIntent
);

/**
 * @swagger
 * /submissions/{id}/submit:
 *   post:
 *     summary: Submit a submission for review
 *     tags: [Submissions]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Submission submitted successfully
 */
router.post(
  "/:id/submit",
  requireRole([Roles.AUTHOR, Roles.ADMIN, Roles.SUPER_ADMIN]),
  validate(idOnlySchema),
  submissionController.submit
);

/**
 * @swagger
 * /submissions/{id}/ai-consent:
 *   post:
 *     summary: Capture AI consent for submission
 *     tags: [AI]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AIConsentRequest'
 *     responses:
 *       200:
 *         description: Consent captured successfully
 */
router.post(
  "/:id/ai-consent",
  requireRole([Roles.AUTHOR, Roles.ADMIN, Roles.SUPER_ADMIN]),
  validate(consentSchema),
  aiController.captureConsent
);

/**
 * @swagger
 * /submissions:
 *   get:
 *     summary: List submissions of the logged-in user
 *     tags: [Submissions]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of submissions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Submission'
 */
router.get(
  "/",
  requireRole([Roles.AUTHOR, Roles.ADMIN, Roles.SUPER_ADMIN]),
  submissionController.listMySubmissions
);

/**
 * @swagger
 * /submissions/{id}:
 *   get:
 *     summary: Get submission details with timeline
 *     tags: [Submissions]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Submission details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SubmissionDetails'
 */
router.get(
  "/:id",
  requireRole([Roles.AUTHOR, Roles.ADMIN, Roles.SUPER_ADMIN]),
  validate(idOnlySchema),
  submissionController.getSubmissionDetails
);

module.exports = router;

/**
 * @swagger
 * components:
 *   schemas:
 *     Submission:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         status:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *
 *     CreateSubmissionRequest:
 *       type: object
 *       properties:
 *         conferenceId:
 *           type: string
 *         trackId:
 *           type: string
 *
 *     UpdateSubmissionRequest:
 *       type: object
 *       properties:
 *         metadata:
 *           type: object
 *
 *     UploadSubmissionFileRequest:
 *       type: object
 *       properties:
 *         fileName:
 *           type: string
 *         fileType:
 *           type: string
 *
 *     AIConsentRequest:
 *       type: object
 *       properties:
 *         consentGiven:
 *           type: boolean
 *
 *     SubmissionDetails:
 *       type: object
 *       properties:
 *         submission:
 *           $ref: '#/components/schemas/Submission'
 *         timeline:
 *           type: array
 *           items:
 *             type: object
 */
