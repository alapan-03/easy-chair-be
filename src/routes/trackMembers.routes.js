const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const { requireConferenceRole, requireTrackRole, requireRole } = require('../middleware/rbac');
const tenantResolver = require('../middleware/tenantResolver');
const { Roles } = require('../constants/roles');
const trackMemberService = require('../services/trackMemberService');
const trackRepository = require('../repositories/trackRepository');
const { ApiError } = require('../utils/errors');

/**
 * POST /tracks/:trackId/members
 * Add a sub-manager to a track
 * Requires: ADMIN, MANAGER, or SUB_MANAGER with conference access
 */
router.post(
    '/:trackId/members',
    authenticate(),
    tenantResolver,
    async (req, res, next) => {
        try {
            const { trackId } = req.params;
            const { userId } = req.body;

            if (!userId) {
                throw new ApiError(400, 'VALIDATION_ERROR', 'userId is required');
            }

            // Get track to check conference
            const track = await trackRepository.findById(trackId);
            if (!track) {
                throw new ApiError(404, 'TRACK_NOT_FOUND', 'Track not found');
            }

            // Permission check - must be ADMIN, MANAGER, or SUB_MANAGER with conference access
            const { orgId } = req.tenant || {};
            const user = req.user;
            const isSuperAdmin = (user.globalRoles || []).includes(Roles.SUPER_ADMIN);
            const orgRole = (user.orgRoles || []).find((m) => String(m.orgId) === String(orgId))?.role;

            if (!isSuperAdmin && orgRole !== Roles.ADMIN && orgRole !== Roles.MANAGER) {
                throw new ApiError(403, 'FORBIDDEN', 'Insufficient permissions to assign track members');
            }

            const result = await trackMemberService.addMemberToTrack(
                trackId,
                { userId },
                req.user
            );

            res.status(result.created ? 201 : 200).json(result);
        } catch (error) {
            next(error);
        }
    }
);

/**
 * GET /tracks/:trackId/members
 * List all sub-managers of a track
 */
router.get(
    '/:trackId/members',
    authenticate(),
    tenantResolver,
    requireRole([Roles.SUPER_ADMIN, Roles.ADMIN, Roles.MANAGER, Roles.SUB_MANAGER]),
    async (req, res, next) => {
        try {
            const { trackId } = req.params;
            const members = await trackMemberService.listTrackMembers(trackId);
            res.json({ data: members });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * GET /tracks/conference/:conferenceId/members
 * List all track assignments for a conference
 */
router.get(
    '/conference/:conferenceId/members',
    authenticate(),
    tenantResolver,
    requireConferenceRole([Roles.ADMIN, Roles.MANAGER, Roles.SUB_MANAGER]),
    async (req, res, next) => {
        try {
            const { conferenceId } = req.params;
            const members = await trackMemberService.listTrackMembersByConference(conferenceId);
            res.json({ data: members });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * DELETE /tracks/:trackId/members/:userId
 * Remove a sub-manager from a track
 */
router.delete(
    '/:trackId/members/:userId',
    authenticate(),
    tenantResolver,
    requireRole([Roles.SUPER_ADMIN, Roles.ADMIN, Roles.MANAGER]),
    async (req, res, next) => {
        try {
            const { trackId, userId } = req.params;
            await trackMemberService.removeMemberFromTrack(trackId, userId);
            res.json({ message: 'Sub-manager removed from track' });
        } catch (error) {
            next(error);
        }
    }
);

module.exports = router;
