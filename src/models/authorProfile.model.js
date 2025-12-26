const { Schema, model } = require('mongoose');

const authorProfileSchema = new Schema(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    affiliation: { type: String, required: true },
    orcid: { type: String, required: true },
    phone: { type: String },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

authorProfileSchema.index({ orgId: 1, userId: 1 }, { unique: true });

module.exports = model('AuthorProfile', authorProfileSchema);
