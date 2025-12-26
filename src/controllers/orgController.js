const orgService = require('../services/orgService');

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

module.exports = {
  createOrganization,
  getMyOrganizations,
};
