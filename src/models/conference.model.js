const { Schema, model } = require('mongoose');

const conferenceSchema = new Schema(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true },
    // Unique token for public signup link (optional for legacy conferences)
    accessToken: { type: String, unique: true, sparse: true, index: true },
    status: { type: String, enum: ['DRAFT', 'ACTIVE', 'ARCHIVED'], default: 'ACTIVE' },
    startDate: { type: Date },
    endDate: { type: Date },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

conferenceSchema.index({ orgId: 1, slug: 1 }, { unique: true });

module.exports = model('Conference', conferenceSchema);

