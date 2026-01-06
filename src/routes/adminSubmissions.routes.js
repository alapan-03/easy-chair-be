const { Router } = require("express");
const { requireRole } = require("../middleware/rbac");
const Roles = require("../constants/roles");
const adminSubmissionController = require("../controllers/adminSubmissionController");
const validate = require("../middleware/validation");
const {
  listAdminSubmissionsSchema,
  adminDecisionSchema,
  adminFinalUploadSchema,
} = require("../validation/adminSubmissionSchemas");

const router = Router();

/**
 * @swagger
 * /admin/submissions:
 *   get:
 *     summary: List submissions (Admin)
 *     description: List submissions with optional filters
 *     tags: [Admin Submissions]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: conferenceId
 *         schema:
 *           type: string
 *           pattern: '^[a-fA-F0-9]{24}$'
 *         description: Filter by conference ID
 *       - in: query
 *         name: trackId
 *         schema:
 *           type: string
 *           pattern: '^[a-fA-F0-9]{24}$'
 *         description: Filter by track ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [DRAFT, SUBMITTED, UNDER_REVIEW, ACCEPTED, REJECTED]
 *         description: Filter by submission status
 *     responses:
 *       200:
 *         description: List of submissions
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Submission'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Admin only)
 */

router.get(
  "/",
  requireRole([Roles.ADMIN, Roles.SUPER_ADMIN]),
  validate(listAdminSubmissionsSchema),
  adminSubmissionController.listSubmissions
);

/**
 * @swagger
 * /admin/submissions/{id}/decision:
 *   post:
 *     summary: Set decision for a submission
 *     description: Approve, reject, or update submission decision
 *     tags: [Admin Submissions]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[a-fA-F0-9]{24}$'
 *         example: "66a8f4c2a1b23c001234abcd"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 description: New submission status
 *                 example: ACCEPTED
 *               notes:
 *                 type: string
 *                 example: "Strong methodology and results."
 *     responses:
 *       200:
 *         description: Decision updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.post(
  "/:id/decision",
  requireRole([Roles.ADMIN, Roles.SUPER_ADMIN]),
  validate(adminDecisionSchema),
  adminSubmissionController.setDecision
);

/**
 * @swagger
 * /admin/submissions/{id}/files/final:
 *   post:
 *     summary: Upload final submission file
 *     description: Upload the final, camera-ready version of a submission
 *     tags: [Admin Submissions]
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
 *             type: object
 *             required:
 *               - originalName
 *               - mimeType
 *               - sizeBytes
 *             properties:
 *               originalName:
 *                 type: string
 *                 example: "final-paper.pdf"
 *               mimeType:
 *                 type: string
 *                 example: "application/pdf"
 *               sizeBytes:
 *                 type: integer
 *                 example: 1048576
 *               checksum:
 *                 type: string
 *                 example: "a3f5c9e7..."
 *     responses:
 *       201:
 *         description: Final file uploaded successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.post(
  "/:id/files/final",
  requireRole([Roles.ADMIN, Roles.SUPER_ADMIN]),
  validate(adminFinalUploadSchema),
  adminSubmissionController.uploadFinalFile
);

module.exports = router;
