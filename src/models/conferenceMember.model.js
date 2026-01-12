const { Schema, model } = require('mongoose');

const conferenceMemberSchema = new Schema(
    {
        orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
        conferenceId: { type: Schema.Types.ObjectId, ref: 'Conference', required: true },
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        role: {
            type: String,
            enum: ['MANAGER', 'SUB_MANAGER', 'AUTHOR'],
            required: true
        },
        // For SUB_MANAGER: can manage entire conference or specific tracks
        managesFullConference: { type: Boolean, default: false },
        assignedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
        isDeleted: { type: Boolean, default: false },
    },
    { timestamps: true }
);

// Unique constraint: one role type per user per conference
conferenceMemberSchema.index({ conferenceId: 1, userId: 1, role: 1 }, { unique: true });
conferenceMemberSchema.index({ orgId: 1, conferenceId: 1 });
conferenceMemberSchema.index({ userId: 1 });
conferenceMemberSchema.index({ conferenceId: 1, role: 1 });

module.exports = model('ConferenceMember', conferenceMemberSchema);
