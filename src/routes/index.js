const { Router } = require('express');
const healthRoutes = require('./health.routes');
const authRoutes = require('./auth.routes');
const orgRoutes = require('./orgs.routes');
const conferenceRoutes = require('./conferences.routes');
const trackRoutes = require('./tracks.routes');
const profileRoutes = require('./profile.routes');
const submissionRoutes = require('./submissions.routes');
const adminSubmissionsRoutes = require('./adminSubmissions.routes');
const adminAIRoutes = require('./adminAI.routes');
const paymentRoutes = require('./payment.routes');
const userRoutes = require('./users.routes');
const authenticate = require('../middleware/auth');
const tenantResolver = require('../middleware/tenantResolver');

const router = Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/webhooks', paymentRoutes);

router.use(authenticate());
router.use(tenantResolver);

router.use('/orgs', orgRoutes);
router.use('/conferences', conferenceRoutes);
router.use('/tracks', trackRoutes);
router.use('/profile', profileRoutes);
router.use('/submissions', submissionRoutes);
router.use('/admin/submissions', adminSubmissionsRoutes);
router.use('/admin', adminAIRoutes);
router.use('/users', userRoutes);

module.exports = router;
