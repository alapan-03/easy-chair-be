const ConferenceMember = require('../models/conferenceMember.model');

const findByConference = async (conferenceId) => {
    return ConferenceMember.find({
        conferenceId,
        isDeleted: false,
        status: 'ACTIVE'
    }).populate('userId', 'name email');
};

const findByConferenceAndRole = async (conferenceId, role) => {
    return ConferenceMember.find({
        conferenceId,
        role,
        isDeleted: false,
        status: 'ACTIVE'
    }).populate('userId', 'name email');
};

const findByUser = async (userId) => {
    return ConferenceMember.find({
        userId,
        isDeleted: false,
        status: 'ACTIVE'
    }).populate('conferenceId', 'name slug orgId');
};

const findByUserAndOrg = async (userId, orgId) => {
    return ConferenceMember.find({
        userId,
        orgId,
        isDeleted: false,
        status: 'ACTIVE'
    }).populate('conferenceId', 'name slug');
};

const findByConferenceAndUser = async (conferenceId, userId) => {
    return ConferenceMember.findOne({
        conferenceId,
        userId,
        isDeleted: false
    });
};

const findByConferenceUserRole = async (conferenceId, userId, role) => {
    return ConferenceMember.findOne({
        conferenceId,
        userId,
        role,
        isDeleted: false
    });
};

const addMember = async ({ orgId, conferenceId, userId, role, assignedBy, managesFullConference = false }) => {
    const existing = await findByConferenceUserRole(conferenceId, userId, role);

    if (existing) {
        if (existing.status === 'ACTIVE') {
            return { member: existing, created: false };
        }
        // Reactivate if inactive
        existing.status = 'ACTIVE';
        existing.assignedBy = assignedBy;
        existing.managesFullConference = managesFullConference;
        await existing.save();
        return { member: existing, created: false };
    }

    const member = await ConferenceMember.create({
        orgId,
        conferenceId,
        userId,
        role,
        assignedBy,
        managesFullConference,
        status: 'ACTIVE',
    });

    return { member, created: true };
};

const removeMember = async (conferenceId, userId, role = null) => {
    const query = { conferenceId, userId, isDeleted: false };
    if (role) {
        query.role = role;
    }

    return ConferenceMember.updateMany(query, {
        $set: { status: 'INACTIVE', isDeleted: true }
    });
};

const updateMemberStatus = async (conferenceId, userId, status) => {
    return ConferenceMember.updateMany(
        { conferenceId, userId, isDeleted: false },
        { $set: { status } }
    );
};

const countByConference = async (conferenceId) => {
    return ConferenceMember.countDocuments({
        conferenceId,
        isDeleted: false,
        status: 'ACTIVE'
    });
};

const countByConferenceAndRole = async (conferenceId, role) => {
    return ConferenceMember.countDocuments({
        conferenceId,
        role,
        isDeleted: false,
        status: 'ACTIVE'
    });
};

module.exports = {
    findByConference,
    findByConferenceAndRole,
    findByUser,
    findByUserAndOrg,
    findByConferenceAndUser,
    findByConferenceUserRole,
    addMember,
    removeMember,
    updateMemberStatus,
    countByConference,
    countByConferenceAndRole,
};
