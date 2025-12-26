const { Schema, model } = require('mongoose');
const Roles = require('../constants/roles');

const orgMemberSchema = new Schema(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: Object.values(Roles), required: true },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

orgMemberSchema.index({ orgId: 1, userId: 1 }, { unique: true });

module.exports = model('OrgMember', orgMemberSchema);
