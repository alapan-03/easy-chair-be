const { ApiError } = require('../utils/errors');

class TenantRepository {
  constructor(model) {
    this.model = model;
  }

  ensureOrg(orgId) {
    if (!orgId) {
      throw new ApiError(400, 'ORG_REQUIRED', 'orgId is required');
    }
  }

  withTenant(orgId, filter = {}) {
    return {
      ...filter,
      orgId,
      isDeleted: false,
    };
  }

  async create(orgId, payload) {
    this.ensureOrg(orgId);
    return this.model.create({ ...payload, orgId });
  }

  async find(orgId, filter = {}, options = {}) {
    this.ensureOrg(orgId);
    return this.model.find(this.withTenant(orgId, filter), null, options).lean();
  }

  async findOne(orgId, filter = {}, options = {}) {
    this.ensureOrg(orgId);
    return this.model.findOne(this.withTenant(orgId, filter), null, options).lean();
  }

  async findById(orgId, id, options = {}) {
    this.ensureOrg(orgId);
    return this.model.findOne(this.withTenant(orgId, { _id: id }), null, options).lean();
  }

  async updateOne(orgId, filter = {}, update = {}, options = {}) {
    this.ensureOrg(orgId);
    return this.model
      .findOneAndUpdate(this.withTenant(orgId, filter), update, { new: true, ...options })
      .lean();
  }
}

module.exports = TenantRepository;
