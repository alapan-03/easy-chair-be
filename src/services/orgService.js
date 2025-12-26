const { ApiError } = require('../utils/errors');
const orgRepository = require('../repositories/organizationRepository');
const orgMemberRepository = require('../repositories/orgMemberRepository');
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

const listOrganizationsForUser = async (userId) => {
  const memberships = await orgMemberRepository.findByUser(userId);
  const orgIds = memberships.map((m) => m.orgId);
  if (orgIds.length === 0) {
    return [];
  }
  return orgRepository.findByIds(orgIds);
};

module.exports = {
  createOrganization,
  listOrganizationsForUser,
};
