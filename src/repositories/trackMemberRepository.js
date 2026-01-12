const TrackMember = require('../models/trackMember.model');

const findByTrack = async (trackId) => {
    return TrackMember.find({
        trackId,
        isDeleted: false,
        status: 'ACTIVE'
    }).populate('userId', 'name email');
};

const findByConference = async (conferenceId) => {
    return TrackMember.find({
        conferenceId,
        isDeleted: false,
        status: 'ACTIVE'
    }).populate('userId', 'name email').populate('trackId', 'name code');
};

const findByUser = async (userId) => {
    return TrackMember.find({
        userId,
        isDeleted: false,
        status: 'ACTIVE'
    }).populate('trackId', 'name code conferenceId');
};

const findByUserAndConference = async (userId, conferenceId) => {
    return TrackMember.find({
        userId,
        conferenceId,
        isDeleted: false,
        status: 'ACTIVE'
    }).populate('trackId', 'name code');
};

const findByTrackAndUser = async (trackId, userId) => {
    return TrackMember.findOne({
        trackId,
        userId,
        isDeleted: false
    });
};

const addMember = async ({ orgId, conferenceId, trackId, userId, role, assignedBy }) => {
    const existing = await findByTrackAndUser(trackId, userId);

    if (existing) {
        if (existing.status === 'ACTIVE') {
            return { member: existing, created: false };
        }
        // Reactivate if inactive
        existing.status = 'ACTIVE';
        existing.assignedBy = assignedBy;
        await existing.save();
        return { member: existing, created: false };
    }

    const member = await TrackMember.create({
        orgId,
        conferenceId,
        trackId,
        userId,
        role,
        assignedBy,
        status: 'ACTIVE',
    });

    return { member, created: true };
};

const removeMember = async (trackId, userId) => {
    return TrackMember.updateOne(
        { trackId, userId, isDeleted: false },
        { $set: { status: 'INACTIVE', isDeleted: true } }
    );
};

const removeAllMembersFromTrack = async (trackId) => {
    return TrackMember.updateMany(
        { trackId, isDeleted: false },
        { $set: { status: 'INACTIVE', isDeleted: true } }
    );
};

const countByTrack = async (trackId) => {
    return TrackMember.countDocuments({
        trackId,
        isDeleted: false,
        status: 'ACTIVE'
    });
};

module.exports = {
    findByTrack,
    findByConference,
    findByUser,
    findByUserAndConference,
    findByTrackAndUser,
    addMember,
    removeMember,
    removeAllMembersFromTrack,
    countByTrack,
};
