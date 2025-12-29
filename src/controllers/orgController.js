const orgService = require('../services/orgService');
const Roles = require('../constants/roles');
const { ApiError } = require('../utils/errors');

const createOrganization = async (req, res) => {
  const org = await orgService.createOrganization({
    name: req.body.name,
    slug: req.body.slug,
    creatorUserId: req.user.userId,
    addCreatorAsAdmin: true,
  });

  res.status(201).json(org);
};

const getMyOrganizations = async (req, res) => {
  const orgs = await orgService.listOrganizationsForUser(req.user.userId);
  res.json({ data: orgs });
};

const addOrgMember = async (req, res) => {
  const { orgId } = req.params;
  const tenantOrgId = req.tenant?.orgId;
  const isSuperAdmin = (req.user.globalRoles || []).includes(Roles.SUPER_ADMIN);

  if (!isSuperAdmin) {
    if (!tenantOrgId) {
      throw new ApiError(400, 'ORG_REQUIRED', 'x-org-id header is required for this operation');
    }
    if (String(tenantOrgId) !== String(orgId)) {
      throw new ApiError(403, 'FORBIDDEN', 'Cannot manage members for another organization');
    }
  }

  const result = await orgService.addMemberToOrganization(orgId, req.body);
  const status = result.created ? 201 : 200;
  res.status(status).json(result);
};

const getOrgMembers = async (req, res) => {
  const { orgId } = req.params;
  const tenantOrgId = req.tenant?.orgId;
  const isSuperAdmin = (req.user.globalRoles || []).includes(Roles.SUPER_ADMIN);

  if (!isSuperAdmin) {
    if (!tenantOrgId) {
      throw new ApiError(400, 'ORG_REQUIRED', 'x-org-id header is required for this operation');
    }
    if (String(tenantOrgId) !== String(orgId)) {
      throw new ApiError(403, 'FORBIDDEN', 'Cannot view members for another organization');
    }
  }

  const members = await orgService.listOrganizationMembers(orgId);
  res.json({ data: members });
};

module.exports = {
  createOrganization,
  getMyOrganizations,
  addOrgMember,
  getOrgMembers,
};
