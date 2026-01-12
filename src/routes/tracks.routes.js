const { Router } = require("express");
const trackController = require("../controllers/trackController");
const { requireRole } = require("../middleware/rbac");
const validate = require("../middleware/validation");
const {
  createTrackSchema,
  listTrackSchema,
} = require("../validation/trackSchemas");
const Roles = require("../constants/roles");

const router = Router();

/**
 * @swagger
 * /tracks:
 *   post:
 *     summary: Create a new track
 *     tags: [Tracks]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - conferenceId
 *               - name
 *               - code
 *             properties:
 *               conferenceId:
 *                 type: string
 *                 example: "66a8f4c2a1b23c001234abcd"
 *               name:
 *                 type: string
 *                 example: "Machine Learning"
 *               code:
 *                 type: string
 *                 example: "ML2026"
 *               status:
 *                 type: string
 *                 enum: [ACTIVE, INACTIVE]
 *                 example: ACTIVE
 *     responses:
 *       200:
 *         description: Track created successfully
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
  validate(createTrackSchema),
  trackController.createTrack
);

/**
 * @swagger
 * /tracks:
 *   get:
 *     summary: List tracks for a conference
 *     tags: [Tracks]
 *     security:
 *       - BearerAuth: []
 *       - OrgIdHeader: []
 *     parameters:
 *       - in: query
 *         name: conferenceId
 *         required: true
 *         schema:
 *           type: string
 *         description: Conference ID to fetch tracks for
 *         example: "66a8f4c2a1b23c001234abcd"
 *     responses:
 *       200:
 *         description: List of tracks
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Track'
 *       400:
 *         description: Validation error (missing or invalid conferenceId)
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Admin / Author only)
 */
router.get(
  "/",
  requireRole([Roles.ADMIN, Roles.MANAGER, Roles.SUB_MANAGER, Roles.AUTHOR, Roles.SUPER_ADMIN]),
  validate(listTrackSchema),
  trackController.listTracks
);

module.exports = router;

/**
 * @swagger
 * components:
 *   schemas:
 *     Track:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           example: "66a8f4c2a1b23c001234abcd"
 *         conferenceId:
 *           type: string
 *           example: "66a8f4c2a1b23c001234abcd"
 *         name:
 *           type: string
 *           example: "Machine Learning"
 *         code:
 *           type: string
 *           example: "ML2026"
 *         status:
 *           type: string
 *           enum: [ACTIVE, INACTIVE]
 *         isDeleted:
 *           type: boolean
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */
