const PaymentIntent = require('../models/paymentIntent.model');
const TenantRepository = require('./tenantRepository');

class PaymentIntentRepository extends TenantRepository {
  constructor() {
    super(PaymentIntent);
  }

  async findBySubmission(orgId, submissionId) {
    return this.find(orgId, { submissionId }, { sort: { createdAt: -1 } });
  }

  async findOneByProviderRef(orgId, providerRef) {
    return this.findOne(orgId, { providerRef });
  }
}

module.exports = new PaymentIntentRepository();
