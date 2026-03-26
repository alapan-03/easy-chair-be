const Submission = require("../models/submission.model");
const TenantRepository = require("./tenantRepository");

class SubmissionRepository extends TenantRepository {
  constructor() {
    super(Submission);
  }
  async find(orgId, filter = {}, options = {}) {
    let query = this.model.find({ orgId, ...filter });

    if (options.populate) {
      if (Array.isArray(options.populate)) {
        options.populate.forEach((p) => {
          query = query.populate(p);
        });
      } else {
        query = query.populate(options.populate);
      }
    }

    return query.exec();
  }
}

module.exports = new SubmissionRepository();
