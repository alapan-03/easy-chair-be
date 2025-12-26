const OrgMember = require('../models/orgMember.model');

const addMember = async ({ orgId, userId, role, status = 'ACTIVE' }) =>
  OrgMember.create({ orgId, userId, role, status });

const findByUser = async (userId) => OrgMember.find({ userId, isDeleted: false }).lean();

const findByOrgAndUser = async (orgId, userId) =>
  OrgMember.findOne({ orgId, userId, isDeleted: false }).lean();

module.exports = {
  addMember,
  findByUser,
  findByOrgAndUser,
};
