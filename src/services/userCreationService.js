const bcrypt = require('bcryptjs');
const { ApiError } = require('../utils/errors');
const { Roles, RoleHierarchy } = require('../constants/roles');
const userRepository = require('../repositories/userRepository');
const orgMemberRepository = require('../repositories/orgMemberRepository');
const conferenceMemberRepository = require('../repositories/conferenceMemberRepository');
const trackMemberRepository = require('../repositories/trackMemberRepository');
const conferenceRepository = require('../repositories/conferenceRepository');
const trackRepository = require('../repositories/trackRepository');
const organizationRepository = require('../repositories/organizationRepository');

/**
 * Create a new user with credentials and assign role
 * Enforces hierarchical permission: only higher roles can create lower roles
 */
const createUserWithRole = async (creatorUser, userData, roleAssignment) => {
    const { email, password, name } = userData;
    const { role, orgId, conferenceId, trackId, managesFullConference } = roleAssignment;

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists
    const existingUser = await userRepository.findByEmail(normalizedEmail);
    if (existingUser) {
        throw new ApiError(409, 'USER_EXISTS', 'A user with this email already exists');
    }

    // Validate creator has permission to create this role
    await validateCreationPermission(creatorUser, role, orgId, conferenceId);

    // Validate the assignment target exists
    await validateAssignmentTarget(role, orgId, conferenceId, trackId);

    // Create the user
    const passwordHash = await bcrypt.hash(password, 10);
    const newUser = await userRepository.createUser({
        email: normalizedEmail,
        name,
        authProvider: 'local',
        passwordHash,
        status: 'ACTIVE',
    });

    // Assign the role based on scope
    let membership;

    if (role === Roles.ADMIN || role === Roles.MANAGER) {
        // Org-level assignment
        membership = await orgMemberRepository.addMember({
            orgId,
            userId: newUser._id,
            role,
            status: 'ACTIVE',
        });
    }

    if (role === Roles.MANAGER && conferenceId) {
        // Also add as conference manager if conference specified
        await conferenceMemberRepository.addMember({
            orgId,
            conferenceId,
            userId: newUser._id,
            role: Roles.MANAGER,
            assignedBy: creatorUser.userId,
            managesFullConference: true,
        });
    }

    if (role === Roles.SUB_MANAGER) {
        if (trackId) {
            // Track-level sub-manager
            const track = await trackRepository.findById(trackId);
            await trackMemberRepository.addMember({
                orgId: track.orgId,
                conferenceId: track.conferenceId,
                trackId,
                userId: newUser._id,
                role: Roles.SUB_MANAGER,
                assignedBy: creatorUser.userId,
            });
        } else if (conferenceId) {
            // Conference-level sub-manager (manages full conference)
            const conference = await conferenceRepository.findById(conferenceId);
            await conferenceMemberRepository.addMember({
                orgId: conference.orgId,
                conferenceId,
                userId: newUser._id,
                role: Roles.SUB_MANAGER,
                assignedBy: creatorUser.userId,
                managesFullConference: managesFullConference !== false,
            });
        }
    }

    return {
        user: {
            id: newUser._id,
            email: newUser.email,
            name: newUser.name,
        },
        role,
        assignment: {
            orgId,
            conferenceId,
            trackId,
        },
    };
};

/**
 * Validate that the creator has permission to create the target role
 */
const validateCreationPermission = async (creatorUser, targetRole, orgId, conferenceId) => {
    const isSuperAdmin = (creatorUser.globalRoles || []).includes(Roles.SUPER_ADMIN);

    // Super Admin can create ADMIN
    if (targetRole === Roles.ADMIN) {
        if (!isSuperAdmin) {
            throw new ApiError(403, 'FORBIDDEN', 'Only Super Admin can create Admin users');
        }
        return;
    }

    // Get creator's org role
    const creatorOrgRole = (creatorUser.orgRoles || [])
        .find(r => String(r.orgId) === String(orgId))?.role;

    // ADMIN (or Super Admin) can create MANAGER
    if (targetRole === Roles.MANAGER) {
        if (!isSuperAdmin && creatorOrgRole !== Roles.ADMIN) {
            throw new ApiError(403, 'FORBIDDEN', 'Only Admin or Super Admin can create Manager users');
        }
        return;
    }

    // MANAGER (or Admin/Super Admin) can create SUB_MANAGER
    if (targetRole === Roles.SUB_MANAGER) {
        if (isSuperAdmin || creatorOrgRole === Roles.ADMIN) {
            return; // OK
        }

        // Check if creator is a manager for the conference
        if (conferenceId) {
            const creatorConferenceRole = (creatorUser.conferenceRoles || [])
                .find(r => String(r.conferenceId) === String(conferenceId))?.role;

            if (creatorOrgRole === Roles.MANAGER || creatorConferenceRole === Roles.MANAGER) {
                return; // OK
            }
        }

        throw new ApiError(403, 'FORBIDDEN', 'Only Manager, Admin, or Super Admin can create Sub-manager users');
    }

    throw new ApiError(400, 'INVALID_ROLE', `Cannot create user with role: ${targetRole}`);
};

/**
 * Validate that the assignment target (org/conference/track) exists
 */
const validateAssignmentTarget = async (role, orgId, conferenceId, trackId) => {
    // ADMIN and MANAGER require orgId
    if ((role === Roles.ADMIN || role === Roles.MANAGER) && !orgId) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'Organization ID is required for Admin/Manager role');
    }

    if (orgId) {
        const org = await organizationRepository.findById(orgId);
        if (!org) {
            throw new ApiError(404, 'ORG_NOT_FOUND', 'Organization not found');
        }
    }

    // SUB_MANAGER requires either conferenceId or trackId
    if (role === Roles.SUB_MANAGER && !conferenceId && !trackId) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'Conference ID or Track ID is required for Sub-manager role');
    }

    if (conferenceId) {
        const conference = await conferenceRepository.findById(conferenceId);
        if (!conference) {
            throw new ApiError(404, 'CONFERENCE_NOT_FOUND', 'Conference not found');
        }
    }

    if (trackId) {
        const track = await trackRepository.findById(trackId);
        if (!track) {
            throw new ApiError(404, 'TRACK_NOT_FOUND', 'Track not found');
        }
    }
};

module.exports = {
    createUserWithRole,
};
