const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const { requireRole } = require('../middleware/rbac');
const validate = require('../middleware/validation');
const { consentSchema, triggerAIAnalysisSchema, listAIReportsQuerySchema } = require('../validation/aiSchemas');

// Admin routes - require ADMIN or SUPER_ADMIN role
router.post(
  '/submissions/:id/ai/run',
  requireRole(['ADMIN', 'SUPER_ADMIN']),
  validate({ body: triggerAIAnalysisSchema }),
  aiController.triggerAnalysis
);

router.get(
  '/submissions/:id/ai',
  requireRole(['ADMIN', 'SUPER_ADMIN']),
  aiController.getReport
);

router.get(
  '/ai/reports',
  requireRole(['ADMIN', 'SUPER_ADMIN']),
  validate({ query: listAIReportsQuerySchema }),
  aiController.listReports
);

router.get(
  '/ai/queue-stats',
  requireRole(['ADMIN', 'SUPER_ADMIN']),
  aiController.getQueueStats
);

module.exports = router;
