const { Schema, model } = require('mongoose');

const paymentIntentSchema = new Schema(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    conferenceId: { type: Schema.Types.ObjectId, ref: 'Conference', required: true },
    submissionId: { type: Schema.Types.ObjectId, ref: 'Submission', required: true },
    authorUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    provider: { type: String, default: 'stub' },
    amountCents: { type: Number, required: true },
    currency: { type: String, default: 'USD' },
    status: { type: String, enum: ['CREATED', 'PAID', 'FAILED', 'EXPIRED'], default: 'CREATED' },
    providerRef: { type: String },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

paymentIntentSchema.index({ submissionId: 1 });
paymentIntentSchema.index({ orgId: 1, conferenceId: 1 });

module.exports = model('PaymentIntent', paymentIntentSchema);
