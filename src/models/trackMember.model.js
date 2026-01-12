const { Schema, model } = require('mongoose');

const trackMemberSchema = new Schema(
    {
        orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
        conferenceId: { type: Schema.Types.ObjectId, ref: 'Conference', required: true },
        trackId: { type: Schema.Types.ObjectId, ref: 'Track', required: true },
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        role: {
            type: String,
            enum: ['SUB_MANAGER'],
            required: true
        },
        assignedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
        isDeleted: { type: Boolean, default: false },
    },
    { timestamps: true }
);

// Unique constraint: one sub-manager per user per track
trackMemberSchema.index({ trackId: 1, userId: 1 }, { unique: true });
trackMemberSchema.index({ orgId: 1, conferenceId: 1, trackId: 1 });
trackMemberSchema.index({ conferenceId: 1, userId: 1 });
trackMemberSchema.index({ userId: 1 });

module.exports = model('TrackMember', trackMemberSchema);
