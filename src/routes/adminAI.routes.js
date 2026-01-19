const express = require("express");
const router = express.Router();
const aiController = require("../controllers/aiController");
const { requireRole } = require("../middleware/rbac");
const validate = require("../middleware/validation");
const {
  consentSchema,
  triggerAIAnalysisSchema,
  listAIReportsQuerySchema,
} = require("../validation/aiSchemas");

/**
 * @swagger
 * /submissions/{id}/ai/run:
 *   post:
 *     summary: Trigger AI analysis for a submission
 *     description: Queue AI summarization, format checks, and similarity analysis
 *     tags: [AI, Admin]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Submission ID
 *         schema:
 *           type: string
 *           pattern: '^[a-fA-F0-9]{24}$'
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Empty body (reserved for future options)
 *     responses:
 *       202:
 *         description: AI analysis job queued successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Admin only)
 */
router.post(
  "/submissions/:id/ai/run",
  requireRole(["ADMIN", "SUPER_ADMIN"]),
  validate(triggerAIAnalysisSchema),
  aiController.triggerAnalysis
);

/**
 * @swagger
 * /submissions/{id}/ai:
 *   get:
 *     summary: Get AI report for a submission
 *     tags: [AI, Admin]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Submission ID
 *         schema:
 *           type: string
 *           pattern: '^[a-fA-F0-9]{24}$'
 *     responses:
 *       200:
 *         description: AI analysis report
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AIReport'
 *       404:
 *         description: Report not found
 *       403:
 *         description: Forbidden
 */
router.get(
  "/submissions/:id/ai",
  requireRole(["ADMIN", "SUPER_ADMIN"]),
  aiController.getReport
);

/**
 * @swagger
 * /ai/reports:
 *   get:
 *     summary: List AI analysis reports
 *     description: List AI reports with optional filters
 *     tags: [AI, Admin]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [QUEUED, RUNNING, DONE, FAILED]
 *       - in: query
 *         name: flagged
 *         schema:
 *           type: string
 *           enum: ['true', 'false']
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           example: 20
 *       - in: query
 *         name: skip
 *         schema:
 *           type: integer
 *           example: 0
 *     responses:
 *       200:
 *         description: List of AI reports
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/AIReport'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get(
  "/ai/reports",
  requireRole(["ADMIN", "SUPER_ADMIN"]),
  validate({ query: listAIReportsQuerySchema }),
  aiController.listReports
);

/**
 * @swagger
 * /ai/queue-stats:
 *   get:
 *     summary: Get AI processing queue statistics
 *     description: Returns job counts and queue health
 *     tags: [AI, Admin]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Queue statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 waiting:
 *                   type: integer
 *                 active:
 *                   type: integer
 *                 completed:
 *                   type: integer
 *                 failed:
 *                   type: integer
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get(
  "/ai/queue-stats",
  requireRole(["ADMIN", "SUPER_ADMIN"]),
  aiController.getQueueStats
);

module.exports = router;
