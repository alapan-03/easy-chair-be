const Roles = require('../constants/roles');
const { ApiError } = require('../utils/errors');

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

module.exports = { requireRole };
