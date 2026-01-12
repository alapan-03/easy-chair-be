const { Router } = require("express");
const conferenceController = require("../controllers/conferenceController");
const { requireRole } = require("../middleware/rbac");
const validate = require("../middleware/validation");
const { createConferenceSchema } = require("../validation/conferenceSchemas");
const {
  upsertConferenceSettingsSchema,
} = require("../validation/conferenceSettingsSchemas");
const Roles = require("../constants/roles");

const router = Router();

/**
 * @swagger
 * /conferences:
 *   post:
 *     summary: Create a new conference
 *     description: Create a conference under the current organization
 *     tags: [Conferences]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 example: "International AI Conference 2026"
 *               slug:
 *                 type: string
 *                 description: Lowercase alphanumeric and hyphen only
 *                 pattern: '^[a-z0-9-]+$'
 *                 example: "ai-conference-2026"
 *               status:
 *                 type: string
 *                 enum: [DRAFT, ACTIVE, ARCHIVED]
 *                 example: DRAFT
 *               startDate:
 *                 type: string
 *                 format: date
 *                 example: "2026-01-15"
 *               endDate:
 *                 type: string
 *                 format: date
 *                 example: "2026-01-18"
 *     responses:
 *       200:
 *         description: Conference created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Admin only)
 */
router.post(
  "/",
  requireRole([Roles.ADMIN, Roles.SUPER_ADMIN]),
  validate(createConferenceSchema),
  conferenceController.createConference
);

/**
 * @swagger
 * /conferences:
 *   get:
 *     summary: List conferences
 *     description: List conferences under the current organization
 *     tags: [Conferences]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 */
router.get(
  "/",
  requireRole([Roles.ADMIN, Roles.MANAGER, Roles.SUB_MANAGER, Roles.AUTHOR, Roles.SUPER_ADMIN]),
  conferenceController.listConferences
);

/**
 * @swagger
 * /conferences/{conferenceId}/settings:
 *   post:
 *     summary: Create or update conference settings
 *     description: Upsert (create or update) configuration settings for a conference
 *     tags: [Conferences]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conferenceId
 *         required: true
 *         description: Conference ID
 *         schema:
 *           type: string
 *           pattern: '^[a-fA-F0-9]{24}$'
 *           example: "66a8f4c2a1b23c001234abcd"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               maxFileSize:
 *                 type: integer
 *                 description: Maximum file size in MB
 *                 example: 25
 *               allowedFileTypes:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["pdf", "docx"]
 *               submissionRules:
 *                 $ref: '#/components/schemas/SubmissionRules'
 *               decisionStatuses:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["ACCEPTED", "REJECTED"]
 *               payments:
 *                 $ref: '#/components/schemas/PaymentsSettings'
 *               ai:
 *                 $ref: '#/components/schemas/AISettings'
 *               certificates:
 *                 $ref: '#/components/schemas/CertificateSettings'
 *     responses:
 *       200:
 *         description: Conference settings saved successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Admin only)
 */
router.post(
  "/:conferenceId/settings",
  requireRole([Roles.ADMIN, Roles.SUPER_ADMIN]),
  validate(upsertConferenceSettingsSchema),
  conferenceController.upsertConferenceSettings
);

module.exports = router;
