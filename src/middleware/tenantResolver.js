const mongoose = require('mongoose');
const { ApiError } = require('../utils/errors');

module.exports = (req, res, next) => {
  const headerOrgId = req.headers['x-org-id'];
  const tokenOrgId = req.user?.orgId;
  const orgId = headerOrgId || tokenOrgId;

  if (orgId) {
    if (!mongoose.Types.ObjectId.isValid(orgId)) {
      return next(new ApiError(400, 'INVALID_ORG', 'Invalid orgId on request'));
    }
    req.tenant = { orgId: String(orgId) };
  } else {
    req.tenant = { orgId: undefined };
  }

  return next();
};
