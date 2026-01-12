const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const tenantResolver = require('../middleware/tenantResolver');
const { requireRole, requireMinimumRole } = require('../middleware/rbac');
const { Roles } = require('../constants/roles');
const userCreationService = require('../services/userCreationService');
const { ApiError } = require('../utils/errors');

/**
 * POST /admin/users/create
 * Create a new user with role assignment
 * 
 * Super Admin → creates ADMIN (for any org)
 * Admin → creates MANAGER (for their org)
 * Manager → creates SUB_MANAGER (for their conference/track)
 */
router.post(
    '/create',
    authenticate(),
    tenantResolver,
    async (req, res, next) => {
        try {
            const { email, password, name, role, orgId, conferenceId, trackId, managesFullConference } = req.body;

            // Validation
            if (!email || !password || !name) {
                throw new ApiError(400, 'VALIDATION_ERROR', 'email, password, and name are required');
            }

            if (!role) {
                throw new ApiError(400, 'VALIDATION_ERROR', 'role is required');
            }

            // Valid roles for creation
            const creatableRoles = [Roles.ADMIN, Roles.MANAGER, Roles.SUB_MANAGER];
            if (!creatableRoles.includes(role)) {
                throw new ApiError(400, 'INVALID_ROLE', `Role must be one of: ${creatableRoles.join(', ')}`);
            }

            const result = await userCreationService.createUserWithRole(
                req.user,
                { email, password, name },
                { role, orgId, conferenceId, trackId, managesFullConference }
            );

            res.status(201).json({
                message: `${role} user created successfully`,
                ...result,
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * POST /admin/users/create-admin
 * Super Admin only - Create an Admin for an organization
 */
router.post(
    '/create-admin',
    authenticate(),
    requireRole([Roles.SUPER_ADMIN], { requireOrg: false }),
    async (req, res, next) => {
        try {
            const { email, password, name, orgId } = req.body;

            if (!email || !password || !name || !orgId) {
                throw new ApiError(400, 'VALIDATION_ERROR', 'email, password, name, and orgId are required');
            }

            const result = await userCreationService.createUserWithRole(
                req.user,
                { email, password, name },
                { role: Roles.ADMIN, orgId }
            );

            res.status(201).json({
                message: 'Admin user created successfully',
                ...result,
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * POST /admin/users/create-manager
 * Admin only - Create a Manager for a conference
 */
router.post(
    '/create-manager',
    authenticate(),
    tenantResolver,
    requireRole([Roles.SUPER_ADMIN, Roles.ADMIN]),
    async (req, res, next) => {
        try {
            const { email, password, name, conferenceId } = req.body;
            const { orgId } = req.tenant;

            if (!email || !password || !name) {
                throw new ApiError(400, 'VALIDATION_ERROR', 'email, password, and name are required');
            }

            const result = await userCreationService.createUserWithRole(
                req.user,
                { email, password, name },
                { role: Roles.MANAGER, orgId, conferenceId }
            );

            res.status(201).json({
                message: 'Manager user created successfully',
                ...result,
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * POST /admin/users/create-submanager
 * Manager only - Create a Sub-manager for a track or conference
 */
router.post(
    '/create-submanager',
    authenticate(),
    tenantResolver,
    requireRole([Roles.SUPER_ADMIN, Roles.ADMIN, Roles.MANAGER]),
    async (req, res, next) => {
        try {
            const { email, password, name, conferenceId, trackId, managesFullConference } = req.body;
            const { orgId } = req.tenant;

            if (!email || !password || !name) {
                throw new ApiError(400, 'VALIDATION_ERROR', 'email, password, and name are required');
            }

            if (!conferenceId && !trackId) {
                throw new ApiError(400, 'VALIDATION_ERROR', 'conferenceId or trackId is required');
            }

            const result = await userCreationService.createUserWithRole(
                req.user,
                { email, password, name },
                { role: Roles.SUB_MANAGER, orgId, conferenceId, trackId, managesFullConference }
            );

            res.status(201).json({
                message: 'Sub-manager user created successfully',
                ...result,
            });
        } catch (error) {
            next(error);
        }
    }
);

module.exports = router;
