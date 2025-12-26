const { Schema, model } = require('mongoose');

const trackSchema = new Schema(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    conferenceId: { type: Schema.Types.ObjectId, ref: 'Conference', required: true },
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, trim: true },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

trackSchema.index({ conferenceId: 1, code: 1 }, { unique: true });
trackSchema.index({ orgId: 1, conferenceId: 1 });

module.exports = model('Track', trackSchema);
