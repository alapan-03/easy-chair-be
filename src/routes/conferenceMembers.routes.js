const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const { requireConferenceRole, requireRole } = require('../middleware/rbac');
const tenantResolver = require('../middleware/tenantResolver');
const { Roles, ConferenceLevelRoles } = require('../constants/roles');
const conferenceMemberService = require('../services/conferenceMemberService');
const { ApiError } = require('../utils/errors');

/**
 * POST /conferences/:conferenceId/members
 * Add a member to a conference (MANAGER, SUB_MANAGER)
 * Requires: ADMIN or MANAGER (at org/conference level)
 */
router.post(
    '/:conferenceId/members',
    authenticate(),
    tenantResolver,
    requireRole([Roles.SUPER_ADMIN, Roles.ADMIN, Roles.MANAGER]),
    async (req, res, next) => {
        try {
            const { conferenceId } = req.params;
            const { userId, role, managesFullConference } = req.body;

            if (!userId || !role) {
                throw new ApiError(400, 'VALIDATION_ERROR', 'userId and role are required');
            }

            if (!ConferenceLevelRoles.includes(role)) {
                throw new ApiError(400, 'INVALID_ROLE', `Role must be one of: ${ConferenceLevelRoles.join(', ')}`);
            }

            // Don't allow assigning AUTHOR via this endpoint
            if (role === Roles.AUTHOR) {
                throw new ApiError(400, 'INVALID_ROLE', 'Authors must sign up via conference access link');
            }

            const result = await conferenceMemberService.addMemberToConference(
                conferenceId,
                { userId, role, managesFullConference },
                req.user
            );

            res.status(result.created ? 201 : 200).json(result);
        } catch (error) {
            next(error);
        }
    }
);

/**
 * GET /conferences/:conferenceId/members
 * List all members of a conference
 * Requires: ADMIN, MANAGER, or SUB_MANAGER with access to conference
 */
router.get(
    '/:conferenceId/members',
    authenticate(),
    tenantResolver,
    requireConferenceRole([Roles.ADMIN, Roles.MANAGER, Roles.SUB_MANAGER]),
    async (req, res, next) => {
        try {
            const { conferenceId } = req.params;
            const members = await conferenceMemberService.listConferenceMembers(conferenceId);
            res.json({ data: members });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * GET /conferences/:conferenceId/members/role/:role
 * List members by role
 */
router.get(
    '/:conferenceId/members/role/:role',
    authenticate(),
    tenantResolver,
    requireConferenceRole([Roles.ADMIN, Roles.MANAGER, Roles.SUB_MANAGER]),
    async (req, res, next) => {
        try {
            const { conferenceId, role } = req.params;
            const members = await conferenceMemberService.listConferenceMembersByRole(conferenceId, role);
            res.json({ data: members });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * DELETE /conferences/:conferenceId/members/:userId
 * Remove a member from a conference
 * Requires: ADMIN or higher
 */
router.delete(
    '/:conferenceId/members/:userId',
    authenticate(),
    tenantResolver,
    requireRole([Roles.SUPER_ADMIN, Roles.ADMIN]),
    async (req, res, next) => {
        try {
            const { conferenceId, userId } = req.params;
            const { role } = req.query; // Optional: remove specific role only

            await conferenceMemberService.removeMemberFromConference(conferenceId, userId, role);
            res.json({ message: 'Member removed from conference' });
        } catch (error) {
            next(error);
        }
    }
);

module.exports = router;
