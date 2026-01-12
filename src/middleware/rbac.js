const { Roles, RoleHierarchy } = require('../constants/roles');
const { ApiError } = require('../utils/errors');
const conferenceMemberRepository = require('../repositories/conferenceMemberRepository');
const trackMemberRepository = require('../repositories/trackMemberRepository');

/**
 * Basic role check middleware (org-level only)
 * For conference/track level checks, use requireConferenceRole or requireTrackRole
 */
const requireRole = (allowedRoles = [], options = {}) => (req, res, next) => {
  const { orgId } = req.tenant || {};
  const user = req.user;
  const requireOrg = options.requireOrg !== false;

  if (!user) {
    return next(new ApiError(401, 'UNAUTHORIZED', 'Authentication required'));
  }

  const isSuperAdmin = (user.globalRoles || []).includes(Roles.SUPER_ADMIN);

  if (isSuperAdmin && allowedRoles.includes(Roles.SUPER_ADMIN)) {
    if (requireOrg && !orgId) {
      return next(new ApiError(400, 'ORG_REQUIRED', 'orgId is required for this operation'));
    }
    return next();
  }

  if (requireOrg && !orgId) {
    return next(new ApiError(400, 'ORG_REQUIRED', 'orgId is required on x-org-id header'));
  }

  const tenantRole = (user.orgRoles || []).find((membership) => String(membership.orgId) === String(orgId))
    ?.role;

  if (tenantRole && allowedRoles.includes(tenantRole)) {
    return next();
  }

  return next(new ApiError(403, 'FORBIDDEN', 'Insufficient role for this operation'));
};

/**
 * Check conference-level role
 * Includes org-level role inheritance (ADMIN/MANAGER at org level can access conferences)
 */
const requireConferenceRole = (allowedRoles = [], options = {}) => async (req, res, next) => {
  const { orgId } = req.tenant || {};
  const user = req.user;
  const conferenceId = req.params.conferenceId || req.params.id || req.body.conferenceId;

  if (!user) {
    return next(new ApiError(401, 'UNAUTHORIZED', 'Authentication required'));
  }

  // Super admin has access to everything
  const isSuperAdmin = (user.globalRoles || []).includes(Roles.SUPER_ADMIN);
  if (isSuperAdmin) {
    return next();
  }

  // Check org-level role (ADMIN and MANAGER at org level have conference access)
  const orgRole = (user.orgRoles || []).find((m) => String(m.orgId) === String(orgId))?.role;
  if (orgRole && (orgRole === Roles.ADMIN || (orgRole === Roles.MANAGER && allowedRoles.includes(Roles.MANAGER)))) {
    return next();
  }

  // Check conference-level role
  if (conferenceId) {
    const conferenceMember = await conferenceMemberRepository.findByConferenceAndUser(conferenceId, user.userId);
    if (conferenceMember && conferenceMember.status === 'ACTIVE' && allowedRoles.includes(conferenceMember.role)) {
      req.conferenceMember = conferenceMember;
      return next();
    }
  }

  return next(new ApiError(403, 'FORBIDDEN', 'Insufficient role for this conference'));
};

/**
 * Check track-level role
 * Includes conference-level role inheritance (MANAGER at conference level can access tracks)
 */
const requireTrackRole = (allowedRoles = [], options = {}) => async (req, res, next) => {
  const { orgId } = req.tenant || {};
  const user = req.user;
  const trackId = req.params.trackId || req.params.id;
  const conferenceId = req.params.conferenceId || req.body.conferenceId;

  if (!user) {
    return next(new ApiError(401, 'UNAUTHORIZED', 'Authentication required'));
  }

  // Super admin has access to everything
  const isSuperAdmin = (user.globalRoles || []).includes(Roles.SUPER_ADMIN);
  if (isSuperAdmin) {
    return next();
  }

  // Check org-level role (ADMIN has track access)
  const orgRole = (user.orgRoles || []).find((m) => String(m.orgId) === String(orgId))?.role;
  if (orgRole === Roles.ADMIN) {
    return next();
  }

  // Check conference-level role (MANAGER at conference level has track access)
  if (conferenceId) {
    const conferenceMember = await conferenceMemberRepository.findByConferenceAndUser(conferenceId, user.userId);
    if (conferenceMember && conferenceMember.status === 'ACTIVE') {
      if (conferenceMember.role === Roles.MANAGER) {
        return next();
      }
      // SUB_MANAGER with full conference access
      if (conferenceMember.role === Roles.SUB_MANAGER && conferenceMember.managesFullConference) {
        return next();
      }
    }
  }

  // Check track-level role
  if (trackId) {
    const trackMember = await trackMemberRepository.findByTrackAndUser(trackId, user.userId);
    if (trackMember && trackMember.status === 'ACTIVE' && allowedRoles.includes(trackMember.role)) {
      req.trackMember = trackMember;
      return next();
    }
  }

  return next(new ApiError(403, 'FORBIDDEN', 'Insufficient role for this track'));
};

/**
 * Check if user has at least the specified role level
 * Uses role hierarchy for comparison
 */
const requireMinimumRole = (minimumRole, options = {}) => async (req, res, next) => {
  const { orgId } = req.tenant || {};
  const user = req.user;

  if (!user) {
    return next(new ApiError(401, 'UNAUTHORIZED', 'Authentication required'));
  }

  // Super admin always passes
  const isSuperAdmin = (user.globalRoles || []).includes(Roles.SUPER_ADMIN);
  if (isSuperAdmin) {
    return next();
  }

  const requiredLevel = RoleHierarchy[minimumRole];

  // Check org-level role
  const orgRole = (user.orgRoles || []).find((m) => String(m.orgId) === String(orgId))?.role;
  if (orgRole && RoleHierarchy[orgRole] >= requiredLevel) {
    return next();
  }

  return next(new ApiError(403, 'FORBIDDEN', `Requires at least ${minimumRole} role`));
};

/**
 * Get user's effective role for a conference (highest of org/conference/track)
 */
const getEffectiveRole = async (user, orgId, conferenceId = null, trackId = null) => {
  // Super admin is highest
  if ((user.globalRoles || []).includes(Roles.SUPER_ADMIN)) {
    return Roles.SUPER_ADMIN;
  }

  let highestRole = null;
  let highestLevel = -1;

  // Check org-level role
  const orgRole = (user.orgRoles || []).find((m) => String(m.orgId) === String(orgId))?.role;
  if (orgRole && RoleHierarchy[orgRole] > highestLevel) {
    highestRole = orgRole;
    highestLevel = RoleHierarchy[orgRole];
  }

  // Check conference-level role
  if (conferenceId) {
    const conferenceMember = await conferenceMemberRepository.findByConferenceAndUser(conferenceId, user.userId);
    if (conferenceMember && conferenceMember.status === 'ACTIVE') {
      if (RoleHierarchy[conferenceMember.role] > highestLevel) {
        highestRole = conferenceMember.role;
        highestLevel = RoleHierarchy[conferenceMember.role];
      }
    }
  }

  // Check track-level role
  if (trackId) {
    const trackMember = await trackMemberRepository.findByTrackAndUser(trackId, user.userId);
    if (trackMember && trackMember.status === 'ACTIVE') {
      if (RoleHierarchy[trackMember.role] > highestLevel) {
        highestRole = trackMember.role;
        highestLevel = RoleHierarchy[trackMember.role];
      }
    }
  }

  return highestRole;
};

module.exports = {
  requireRole,
  requireConferenceRole,
  requireTrackRole,
  requireMinimumRole,
  getEffectiveRole,
};
