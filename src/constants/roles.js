const Roles = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  SUB_MANAGER: 'SUB_MANAGER',
  AUTHOR: 'AUTHOR', // Conference-level only, authors sign up via conference link
};

// Role hierarchy for permission checking (higher index = more permissions)
const RoleHierarchy = {
  AUTHOR: 0,
  SUB_MANAGER: 1,
  MANAGER: 2,
  ADMIN: 3,
  SUPER_ADMIN: 4,
};

// Roles that can be assigned at organization level
const OrgLevelRoles = [Roles.ADMIN, Roles.MANAGER];

// Roles that can be assigned at conference level
const ConferenceLevelRoles = [Roles.MANAGER, Roles.SUB_MANAGER, Roles.AUTHOR];

// Roles that can be assigned at track level
const TrackLevelRoles = [Roles.SUB_MANAGER];

// Export Roles as default for backwards compatibility with:
// const Roles = require('./roles') 
// and Object.values(Roles) calls
module.exports = Roles;

// Also export named constants for destructuring:
// const { Roles, RoleHierarchy } = require('./roles')
module.exports.Roles = Roles;
module.exports.RoleHierarchy = RoleHierarchy;
module.exports.OrgLevelRoles = OrgLevelRoles;
module.exports.ConferenceLevelRoles = ConferenceLevelRoles;
module.exports.TrackLevelRoles = TrackLevelRoles;
