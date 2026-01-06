const { Router } = require("express");
const orgController = require("../controllers/orgController");
const validate = require("../middleware/validation");
const {
  createOrgSchema,
  addOrgMemberSchema,
  getOrgMembersSchema,
} = require("../validation/orgSchemas");
const { requireRole } = require("../middleware/rbac");
const Roles = require("../constants/roles");

const router = Router();

/**
 * @swagger
 * /organizations:
 *   post:
 *     summary: Create a new organization
 *     description: Create an organization (Super Admin only)
 *     tags: [Organizations]
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
 *                 example: "OpenAI Research Org"
 *               slug:
 *                 type: string
 *                 pattern: '^[a-z0-9-]+$'
 *                 example: "openai-research"
 *     responses:
 *       200:
 *         description: Organization created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Super Admin only)
 */
router.post(
  "/",
  requireRole([Roles.SUPER_ADMIN], { requireOrg: false }),
  validate(createOrgSchema),
  orgController.createOrganization
);

/**
 * @swagger
 * /organizations/me:
 *   get:
 *     summary: Get organizations of the current user
 *     tags: [Organizations]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of organizations the user belongs to
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Organization'
 *       401:
 *         description: Unauthorized
 */
router.get("/me", orgController.getMyOrganizations);

/**
 * @swagger
 * /organizations/{orgId}/members:
 *   post:
 *     summary: Add a member to an organization
 *     description: Add a user as Admin or Author to an organization
 *     tags: [Organizations]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orgId
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
 *               - userId
 *               - role
 *             properties:
 *               userId:
 *                 type: string
 *                 pattern: '^[a-fA-F0-9]{24}$'
 *                 example: "66a8f4c2a1b23c00999abcde"
 *               role:
 *                 type: string
 *                 enum: [ADMIN, AUTHOR]
 *                 example: AUTHOR
 *     responses:
 *       200:
 *         description: Member added successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.post(
  "/:orgId/members",
  requireRole([Roles.ADMIN, Roles.SUPER_ADMIN], { requireOrg: false }),
  validate(addOrgMemberSchema),
  orgController.addOrgMember
);

/**
 * @swagger
 * /organizations/{orgId}/members:
 *   get:
 *     summary: Get members of an organization
 *     tags: [Organizations]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orgId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[a-fA-F0-9]{24}$'
 *         example: "66a8f4c2a1b23c001234abcd"
 *     responses:
 *       200:
 *         description: List of organization members
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/OrganizationMember'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get(
  "/:orgId/members",
  requireRole([Roles.ADMIN, Roles.AUTHOR, Roles.SUPER_ADMIN], {
    requireOrg: false,
  }),
  validate(getOrgMembersSchema),
  orgController.getOrgMembers
);

module.exports = router;
