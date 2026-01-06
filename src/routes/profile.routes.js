const { Router } = require("express");
const { requireRole } = require("../middleware/rbac");
const Roles = require("../constants/roles");
const authorProfileController = require("../controllers/authorProfileController");
const validate = require("../middleware/validation");
const {
  upsertAuthorProfileSchema,
} = require("../validation/authorProfileSchemas");

const router = Router();

/**
 * @swagger
 * /profile:
 *   post:
 *     summary: Upsert profile
 *     tags: [Profile]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - affiliation
 *               - name
 *               - orcid
 *               - phone
 *             properties:
 *               affiliation:
 *                 type: string
 *               name:
 *                 type: string
 *                 example: "Machine Learning"
 *               orcid:
 *                 type: string
 *                 example: "orc13"
 *               phone:
 *                 type: string
 *                 example: "123456789"
 *     responses:
 *       200:
 *         description: Profile upserted successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Admin only)
 */
router.post(
  "/",
  requireRole([Roles.AUTHOR, Roles.ADMIN, Roles.SUPER_ADMIN]),
  validate(upsertAuthorProfileSchema),
  authorProfileController.upsertProfile
);

/**
 * @swagger
 * /profile:
 *   get:
 *     summary: Get Profile
 *     tags: [Profile]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 */
router.get(
  "/",
  requireRole([Roles.AUTHOR, Roles.ADMIN, Roles.SUPER_ADMIN]),
  authorProfileController.getProfile
);

module.exports = router;



/**
 * @swagger
 * components:
 *   schemas:
 *     AuthorProfile:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: Author profile ID
 *           example: "66a8f4c2a1b23c001234abcd"
 *         orgId:
 *           type: string
 *           description: Organization ID
 *           example: "66a8f4c2a1b23c001234abcd"
 *         userId:
 *           type: string
 *           description: User ID
 *           example: "66a8f4c2a1b23c001234abcd"
 *         name:
 *           type: string
 *           example: "John Doe"
 *         affiliation:
 *           type: string
 *           example: "Indian Institute of Technology"
 *         orcid:
 *           type: string
 *           example: "0000-0002-1825-0097"
 *         phone:
 *           type: string
 *           example: "+91-9876543210"
 *         isDeleted:
 *           type: boolean
 *           example: false
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *       required:
 *         - id
 *         - orgId
 *         - userId
 *         - name
 *         - affiliation
 *         - orcid
 */
