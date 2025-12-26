const { Schema, model } = require('mongoose');

const submissionRulesSchema = new Schema(
  {
    maxFileSizeMb: { type: Number, default: 25 },
    allowedTypes: { type: [String], default: ['application/pdf'] },
    allowAuthorRevisionAfterSubmit: { type: Boolean, default: false },
    allowAdminUploadFinal: { type: Boolean, default: true },
  },
  { _id: false }
);

const paymentsSchema = new Schema(
  {
    requiredBeforeSubmit: { type: Boolean, default: true },
    currency: { type: String, default: 'USD' },
    amountCents: { type: Number, default: 0 },
    refundPolicy: { type: String, default: 'no_refunds' },
  },
  { _id: false }
);

const aiSchema = new Schema(
  {
    enabled: { type: Boolean, default: true },
    visibility: { type: String, enum: ['admin_only', 'author_visible'], default: 'admin_only' },
    runMode: { type: String, enum: ['both', 'plagiarism_only', 'assist_only'], default: 'both' },
    plagiarismThresholdPct: { type: Number, default: 20 },
    excludeReferencesToggle: { type: Boolean, default: true },
  },
  { _id: false }
);

const certificatesSchema = new Schema(
  {
    manualOnly: { type: Boolean, default: true },
    delivery: { type: [String], default: ['email', 'download'] },
  },
  { _id: false }
);

const conferenceSettingsSchema = new Schema(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    conferenceId: { type: Schema.Types.ObjectId, ref: 'Conference', required: true },
    submissionRules: { type: submissionRulesSchema, default: () => ({}) },
    decisionStatuses: { type: [String], default: ['ACCEPT', 'REJECT', 'REVISION'] },
    payments: { type: paymentsSchema, default: () => ({}) },
    ai: { type: aiSchema, default: () => ({}) },
    certificates: { type: certificatesSchema, default: () => ({}) },
    emailTemplatesEnabled: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

conferenceSettingsSchema.index({ conferenceId: 1 }, { unique: true });
conferenceSettingsSchema.index({ orgId: 1, conferenceId: 1 });

module.exports = model('ConferenceSettings', conferenceSettingsSchema);
