const OrgMember = require('../models/orgMember.model');

const addMember = async ({ orgId, userId, role, status = 'ACTIVE' }) => {
  const member = await OrgMember.create({ orgId, userId, role, status });
  return member.toObject();
};

const updateMember = async ({ orgId, userId, role, status = 'ACTIVE' }) =>
  OrgMember.findOneAndUpdate(
    { orgId, userId, isDeleted: false },
    { role, status, isDeleted: false },
    { new: true }
  ).lean();

const findByUser = async (userId) => OrgMember.find({ userId, isDeleted: false }).lean();

const findByOrgAndUser = async (orgId, userId) =>
  OrgMember.findOne({ orgId, userId, isDeleted: false }).lean();

module.exports = {
  addMember,
  updateMember,
  findByUser,
  findByOrgAndUser,
};
