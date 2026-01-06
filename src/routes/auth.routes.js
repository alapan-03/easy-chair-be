const { Router } = require("express");
const authController = require("../controllers/authController");
const validate = require("../middleware/validation");
const { loginSchema } = require("../validation/authSchemas");

const router = Router();

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login user
 *     description: >
 *       Login using email. Password is optional for social or magic-link based login.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               name:
 *                 type: string
 *                 example: John Doe
 *               password:
 *                 type: string
 *                 format: password
 *                 example: StrongPass123
 *               orgId:
 *                 type: string
 *                 description: Optional organization ID (Mongo ObjectId)
 *                 pattern: '^[a-fA-F0-9]{24}$'
 *                 example: "66a8f4c2a1b23c001234abcd"
 *     responses:
 *       200:
 *         description: Login successful
 *       400:
 *         description: Validation error
 *       401:
 *         description: Invalid credentials
 */
router.post("/login", validate(loginSchema), authController.login);

module.exports = router;
