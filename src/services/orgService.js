const { ApiError } = require('../utils/errors');
const orgRepository = require('../repositories/organizationRepository');
const orgMemberRepository = require('../repositories/orgMemberRepository');
const conferenceMemberRepository = require('../repositories/conferenceMemberRepository');
const trackMemberRepository = require('../repositories/trackMemberRepository');
const userRepository = require('../repositories/userRepository');
const Roles = require('../constants/roles');
const slugify = require('../utils/slugify');

const createOrganization = async ({ name, slug, creatorUserId, addCreatorAsAdmin = false }) => {
  const finalSlug = slug ? slug.toLowerCase() : slugify(name);

  const existing = await orgRepository.findBySlug(finalSlug);
  if (existing) {
    throw new ApiError(409, 'ORG_EXISTS', 'Organization slug already exists');
  }

  const organization = await orgRepository.createOrganization({
    name,
    slug: finalSlug,
    status: 'ACTIVE',
  });

  if (addCreatorAsAdmin && creatorUserId) {
    await orgMemberRepository.addMember({
      orgId: organization._id,
      userId: creatorUserId,
      role: Roles.ADMIN,
    });
  }

  return organization;
};

const addMemberToOrganization = async (orgId, { userId, role }) => {
  const organization = await orgRepository.findById(orgId);
  if (!organization) {
    throw new ApiError(404, 'ORG_NOT_FOUND', 'Organization not found');
  }

  const user = await userRepository.findById(userId);
  if (!user) {
    throw new ApiError(404, 'USER_NOT_FOUND', 'User not found');
  }

  const existing = await orgMemberRepository.findByOrgAndUser(orgId, userId);
  if (existing) {
    if (existing.role === role && existing.status === 'ACTIVE') {
      return { member: existing, created: false };
    }
    const updated = await orgMemberRepository.updateMember({ orgId, userId, role, status: 'ACTIVE' });
    return { member: updated, created: false };
  }

  const created = await orgMemberRepository.addMember({ orgId, userId, role, status: 'ACTIVE' });
  const member = created?.toObject ? created.toObject() : created;
  return { member, created: true };
};

/**
 * List organizations where user has ANY role:
 * - Direct org membership (ADMIN, MANAGER)
 * - Conference membership (MANAGER, SUB_MANAGER, AUTHOR)
 * - Track membership (SUB_MANAGER)
 */
const listOrganizationsForUser = async (userId) => {
  // Get org IDs from all membership types
  const orgIdSet = new Set();

  // 1. Direct org memberships
  const orgMemberships = await orgMemberRepository.findByUser(userId);
  orgMemberships.forEach((m) => orgIdSet.add(String(m.orgId)));

  // 2. Conference memberships (have orgId field)
  const conferenceMemberships = await conferenceMemberRepository.findByUser(userId);
  conferenceMemberships.forEach((m) => {
    if (m.orgId) orgIdSet.add(String(m.orgId));
  });

  // 3. Track memberships (have orgId field)
  const trackMemberships = await trackMemberRepository.findByUser(userId);
  trackMemberships.forEach((m) => {
    if (m.orgId) orgIdSet.add(String(m.orgId));
  });

  const orgIds = Array.from(orgIdSet);
  if (orgIds.length === 0) {
    return [];
  }

  return orgRepository.findByIds(orgIds);
};

const listOrganizationMembers = async (orgId) => {
  const organization = await orgRepository.findById(orgId);
  if (!organization) {
    throw new ApiError(404, 'ORG_NOT_FOUND', 'Organization not found');
  }

  const members = await orgMemberRepository.findByOrgWithUsers(orgId);
  return members.map((member) => ({
    orgId: String(member.orgId),
    userId: String(member.userId?._id || member.userId),
    role: member.role,
    status: member.status,
    user: member.userId
      ? { id: member.userId._id, name: member.userId.name, email: member.userId.email }
      : undefined,
  }));
};

module.exports = {
  createOrganization,
  addMemberToOrganization,
  listOrganizationsForUser,
  listOrganizationMembers,
};

