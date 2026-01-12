const { ApiError } = require('../utils/errors');
const { Roles, ConferenceLevelRoles, RoleHierarchy } = require('../constants/roles');
const conferenceMemberRepository = require('../repositories/conferenceMemberRepository');
const conferenceRepository = require('../repositories/conferenceRepository');
const userRepository = require('../repositories/userRepository');

/**
 * Add a member to a conference with specified role
 */
const addMemberToConference = async (conferenceId, { userId, role, assignedBy, managesFullConference = false }, requestingUser) => {
    // Validate role is allowed at conference level
    if (!ConferenceLevelRoles.includes(role)) {
        throw new ApiError(400, 'INVALID_ROLE', `Role ${role} cannot be assigned at conference level`);
    }

    const conference = await conferenceRepository.findById(conferenceId);
    if (!conference) {
        throw new ApiError(404, 'CONFERENCE_NOT_FOUND', 'Conference not found');
    }

    const user = await userRepository.findById(userId);
    if (!user) {
        throw new ApiError(404, 'USER_NOT_FOUND', 'User not found');
    }

    // Permission check: only higher roles can assign lower roles
    const requestingUserRole = await getHighestRoleForConference(requestingUser.userId, conferenceId, conference.orgId) ||
        getHighestOrgRole(requestingUser, conference.orgId);

    if (RoleHierarchy[requestingUserRole] <= RoleHierarchy[role] && requestingUserRole !== Roles.SUPER_ADMIN) {
        throw new ApiError(403, 'FORBIDDEN', 'Cannot assign a role equal to or higher than your own');
    }

    const result = await conferenceMemberRepository.addMember({
        orgId: conference.orgId,
        conferenceId,
        userId,
        role,
        assignedBy: assignedBy || requestingUser.userId,
        managesFullConference,
    });

    return result;
};

/**
 * Get the highest role a user has for a specific conference
 */
const getHighestRoleForConference = async (userId, conferenceId, orgId) => {
    const memberships = await conferenceMemberRepository.findByConferenceAndUser(conferenceId, userId);
    if (!memberships) return null;

    // Return the role (single membership per user per role, so just return it)
    return memberships.role;
};

/**
 * Get the highest org-level role for a user
 */
const getHighestOrgRole = (user, orgId) => {
    if ((user.globalRoles || []).includes(Roles.SUPER_ADMIN)) {
        return Roles.SUPER_ADMIN;
    }

    const orgMembership = (user.orgRoles || []).find(m => String(m.orgId) === String(orgId));
    return orgMembership?.role || null;
};

/**
 * Remove a member from a conference
 */
const removeMemberFromConference = async (conferenceId, userId, role = null) => {
    const conference = await conferenceRepository.findById(conferenceId);
    if (!conference) {
        throw new ApiError(404, 'CONFERENCE_NOT_FOUND', 'Conference not found');
    }

    const result = await conferenceMemberRepository.removeMember(conferenceId, userId, role);
    return result;
};

/**
 * List all members of a conference
 */
const listConferenceMembers = async (conferenceId) => {
    const conference = await conferenceRepository.findById(conferenceId);
    if (!conference) {
        throw new ApiError(404, 'CONFERENCE_NOT_FOUND', 'Conference not found');
    }

    const members = await conferenceMemberRepository.findByConference(conferenceId);
    return members.map(member => ({
        conferenceId: String(member.conferenceId),
        userId: String(member.userId?._id || member.userId),
        role: member.role,
        status: member.status,
        managesFullConference: member.managesFullConference,
        user: member.userId ? {
            id: member.userId._id,
            name: member.userId.name,
            email: member.userId.email
        } : undefined,
    }));
};

/**
 * List members by role
 */
const listConferenceMembersByRole = async (conferenceId, role) => {
    const members = await conferenceMemberRepository.findByConferenceAndRole(conferenceId, role);
    return members.map(member => ({
        conferenceId: String(member.conferenceId),
        userId: String(member.userId?._id || member.userId),
        role: member.role,
        user: member.userId ? {
            id: member.userId._id,
            name: member.userId.name,
            email: member.userId.email
        } : undefined,
    }));
};

/**
 * Get user's conferences with their roles
 */
const getUserConferences = async (userId) => {
    const memberships = await conferenceMemberRepository.findByUser(userId);
    return memberships.map(m => ({
        conferenceId: String(m.conferenceId?._id || m.conferenceId),
        conference: m.conferenceId ? {
            name: m.conferenceId.name,
            slug: m.conferenceId.slug,
            orgId: String(m.conferenceId.orgId),
        } : undefined,
        role: m.role,
        managesFullConference: m.managesFullConference,
    }));
};

/**
 * Check if user has specific role in conference
 */
const hasConferenceRole = async (userId, conferenceId, requiredRoles) => {
    const membership = await conferenceMemberRepository.findByConferenceAndUser(conferenceId, userId);
    if (!membership) return false;
    return requiredRoles.includes(membership.role);
};

module.exports = {
    addMemberToConference,
    removeMemberFromConference,
    listConferenceMembers,
    listConferenceMembersByRole,
    getUserConferences,
    hasConferenceRole,
    getHighestRoleForConference,
    getHighestOrgRole,
};
