const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config');
const Roles = require('../constants/roles');
const { ApiError } = require('../utils/errors');
const userRepository = require('../repositories/userRepository');
const orgMemberRepository = require('../repositories/orgMemberRepository');

const buildToken = (payload) => jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.expiresIn });

const login = async ({ email, password, name, orgId }) => {
  const normalizedEmail = email.toLowerCase();

  let user = await userRepository.findByEmail(normalizedEmail);

  if (!user) {
    const passwordHash = password ? await bcrypt.hash(password, 10) : undefined;
    user = await userRepository.createUser({
      email: normalizedEmail,
      name: name || normalizedEmail.split('@')[0],
      authProvider: 'local',
      passwordHash,
      status: 'ACTIVE',
    });
  } else if (password && user.passwordHash) {
    const matches = await bcrypt.compare(password, user.passwordHash);
    if (!matches) {
      throw new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid email/password combination');
    }
  }

  const memberships = await orgMemberRepository.findByUser(user._id);
  const globalRoles = config.superAdminEmails.includes(normalizedEmail) ? [Roles.SUPER_ADMIN] : [];

  if (orgId) {
    const hasMembership = memberships.some((m) => String(m.orgId) === String(orgId));
    const isSuperAdmin = globalRoles.includes(Roles.SUPER_ADMIN);
    if (!hasMembership && !isSuperAdmin) {
      throw new ApiError(403, 'FORBIDDEN', 'User is not a member of this organization');
    }
  }

  const payload = {
    sub: String(user._id),
    email: user.email,
    orgId,
    orgRoles: memberships.map((m) => ({ orgId: String(m.orgId), role: m.role })),
    globalRoles,
  };

  const token = buildToken(payload);

  return {
    token,
    user: {
      id: user._id,
      email: user.email,
      name: user.name,
      roles: globalRoles,
      orgRoles: payload.orgRoles,
    },
  };
};

module.exports = {
  login,
};
