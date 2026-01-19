const { Router } = require("express");
const authController = require("../controllers/authController");
const validate = require("../middleware/validation");
const { loginSchema, googleLoginSchema } = require("../validation/authSchemas");

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

/**
 * @swagger
 * /auth/google:
 *   post:
 *     summary: Login with Google
 *     description: >
 *       Authenticate using a Google ID token. Creates a new user if one doesn't exist.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - idToken
 *             properties:
 *               idToken:
 *                 type: string
 *                 description: Google ID token obtained from Google Sign-In
 *                 example: "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
 *               orgId:
 *                 type: string
 *                 description: Optional organization ID (Mongo ObjectId)
 *                 pattern: '^[a-fA-F0-9]{24}$'
 *                 example: "66a8f4c2a1b23c001234abcd"
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   description: JWT authentication token
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     email:
 *                       type: string
 *                     name:
 *                       type: string
 *                     profilePicture:
 *                       type: string
 *       400:
 *         description: Validation error or invalid token
 *       401:
 *         description: Invalid Google token
 */
router.post("/google", validate(googleLoginSchema), authController.googleLogin);

module.exports = router;

