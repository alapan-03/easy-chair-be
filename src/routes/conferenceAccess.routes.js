const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config');
const { Roles } = require('../constants/roles');
const conferenceRepository = require('../repositories/conferenceRepository');
const conferenceMemberRepository = require('../repositories/conferenceMemberRepository');
const userRepository = require('../repositories/userRepository');
const conferenceService = require('../services/conferenceService');
const { ApiError } = require('../utils/errors');

/**
 * GET /conference/join/:accessToken
 * Public endpoint - Get conference info by access token
 */
router.get('/join/:accessToken', async (req, res, next) => {
    try {
        const { accessToken } = req.params;
        const conference = await conferenceService.getConferenceByAccessToken(accessToken);

        res.json({
            id: conference._id,
            name: conference.name,
            slug: conference.slug,
            status: conference.status,
            startDate: conference.startDate,
            endDate: conference.endDate,
            orgId: conference.orgId,
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /conference/join/:accessToken
 * Public endpoint - Sign up or sign in via conference access link
 * If user exists and has credentials, they get their existing role
 * If new user, they become an AUTHOR for this conference
 */
router.post('/join/:accessToken', async (req, res, next) => {
    try {
        const { accessToken } = req.params;
        const { email, password, name } = req.body;

        if (!email) {
            throw new ApiError(400, 'VALIDATION_ERROR', 'Email is required');
        }

        const conference = await conferenceService.getConferenceByAccessToken(accessToken);
        const normalizedEmail = email.toLowerCase();

        // Find or create user
        let user = await userRepository.findByEmail(normalizedEmail);
        let isNewUser = false;

        if (!user) {
            // Create new user
            const passwordHash = password ? await bcrypt.hash(password, 10) : undefined;
            user = await userRepository.createUser({
                email: normalizedEmail,
                name: name || normalizedEmail.split('@')[0],
                authProvider: 'local',
                passwordHash,
                status: 'ACTIVE',
            });
            isNewUser = true;
        } else if (password && user.passwordHash) {
            // Verify password for existing user
            const matches = await bcrypt.compare(password, user.passwordHash);
            if (!matches) {
                throw new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid email/password combination');
            }
        }

        // Check if user already has a role in this conference
        const existingMembership = await conferenceMemberRepository.findByConferenceAndUser(conference._id, user._id);

        if (!existingMembership) {
            // Add as AUTHOR if no existing membership
            await conferenceMemberRepository.addMember({
                orgId: conference.orgId,
                conferenceId: conference._id,
                userId: user._id,
                role: Roles.AUTHOR,
            });
        }

        // Build JWT with all memberships
        const orgMemberRepository = require('../repositories/orgMemberRepository');
        const trackMemberRepository = require('../repositories/trackMemberRepository');

        const orgMemberships = await orgMemberRepository.findByUser(user._id);
        const conferenceMemberships = await conferenceMemberRepository.findByUser(user._id);
        const trackMemberships = await trackMemberRepository.findByUser(user._id);

        const globalRoles = config.superAdminEmails.includes(normalizedEmail) ? [Roles.SUPER_ADMIN] : [];

        const payload = {
            sub: String(user._id),
            email: user.email,
            orgId: String(conference.orgId),
            orgRoles: orgMemberships.map((m) => ({ orgId: String(m.orgId), role: m.role })),
            conferenceRoles: conferenceMemberships.map((m) => ({
                conferenceId: String(m.conferenceId?._id || m.conferenceId),
                orgId: String(m.orgId),
                role: m.role,
                managesFullConference: m.managesFullConference || false,
            })),
            trackRoles: trackMemberships.map((m) => ({
                trackId: String(m.trackId?._id || m.trackId),
                conferenceId: String(m.conferenceId),
                role: m.role,
            })),
            globalRoles,
        };

        const token = jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.expiresIn });

        res.status(isNewUser ? 201 : 200).json({
            token,
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
                roles: globalRoles,
                orgRoles: payload.orgRoles,
                conferenceRoles: payload.conferenceRoles,
                trackRoles: payload.trackRoles,
            },
            conference: {
                id: conference._id,
                name: conference.name,
                slug: conference.slug,
                orgId: conference.orgId,
            },
            isNewUser,
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
