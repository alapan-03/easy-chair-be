const Organization = require('../models/organization.model');

const createOrganization = async (payload) => Organization.create(payload);

const findById = async (id) => Organization.findOne({ _id: id, isDeleted: false }).lean();

const findBySlug = async (slug) => Organization.findOne({ slug: slug.toLowerCase(), isDeleted: false }).lean();

const findByIds = async (ids = []) => Organization.find({ _id: { $in: ids }, isDeleted: false }).lean();

module.exports = {
  createOrganization,
  findById,
  findBySlug,
  findByIds,
};
