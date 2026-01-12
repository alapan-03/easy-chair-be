const { Schema, model } = require('mongoose');

// Valid roles for organization-level membership (includes inherited roles for higher-level access)
const OrgMemberRoles = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'];

const orgMemberSchema = new Schema(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: OrgMemberRoles, required: true },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

orgMemberSchema.index({ orgId: 1, userId: 1 }, { unique: true });

module.exports = model('OrgMember', orgMemberSchema);

