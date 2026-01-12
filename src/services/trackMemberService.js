const { ApiError } = require('../utils/errors');
const { Roles, TrackLevelRoles } = require('../constants/roles');
const trackMemberRepository = require('../repositories/trackMemberRepository');
const trackRepository = require('../repositories/trackRepository');
const conferenceRepository = require('../repositories/conferenceRepository');
const userRepository = require('../repositories/userRepository');

/**
 * Add a sub-manager to a track
 */
const addMemberToTrack = async (trackId, { userId, assignedBy }, requestingUser) => {
    const track = await trackRepository.findById(trackId);
    if (!track) {
        throw new ApiError(404, 'TRACK_NOT_FOUND', 'Track not found');
    }

    const conference = await conferenceRepository.findById(track.conferenceId);
    if (!conference) {
        throw new ApiError(404, 'CONFERENCE_NOT_FOUND', 'Conference not found');
    }

    const user = await userRepository.findById(userId);
    if (!user) {
        throw new ApiError(404, 'USER_NOT_FOUND', 'User not found');
    }

    const result = await trackMemberRepository.addMember({
        orgId: track.orgId,
        conferenceId: track.conferenceId,
        trackId,
        userId,
        role: Roles.SUB_MANAGER,
        assignedBy: assignedBy || requestingUser.userId,
    });

    return result;
};

/**
 * Remove a sub-manager from a track
 */
const removeMemberFromTrack = async (trackId, userId) => {
    const track = await trackRepository.findById(trackId);
    if (!track) {
        throw new ApiError(404, 'TRACK_NOT_FOUND', 'Track not found');
    }

    const result = await trackMemberRepository.removeMember(trackId, userId);
    return result;
};

/**
 * List all sub-managers of a track
 */
const listTrackMembers = async (trackId) => {
    const track = await trackRepository.findById(trackId);
    if (!track) {
        throw new ApiError(404, 'TRACK_NOT_FOUND', 'Track not found');
    }

    const members = await trackMemberRepository.findByTrack(trackId);
    return members.map(member => ({
        trackId: String(member.trackId),
        conferenceId: String(member.conferenceId),
        userId: String(member.userId?._id || member.userId),
        role: member.role,
        status: member.status,
        user: member.userId ? {
            id: member.userId._id,
            name: member.userId.name,
            email: member.userId.email
        } : undefined,
    }));
};

/**
 * List all track assignments for a conference
 */
const listTrackMembersByConference = async (conferenceId) => {
    const members = await trackMemberRepository.findByConference(conferenceId);
    return members.map(member => ({
        trackId: String(member.trackId?._id || member.trackId),
        track: member.trackId ? {
            name: member.trackId.name,
            code: member.trackId.code,
        } : undefined,
        userId: String(member.userId?._id || member.userId),
        role: member.role,
        user: member.userId ? {
            id: member.userId._id,
            name: member.userId.name,
            email: member.userId.email
        } : undefined,
    }));
};

/**
 * Get user's track assignments
 */
const getUserTracks = async (userId) => {
    const memberships = await trackMemberRepository.findByUser(userId);
    return memberships.map(m => ({
        trackId: String(m.trackId?._id || m.trackId),
        track: m.trackId ? {
            name: m.trackId.name,
            code: m.trackId.code,
            conferenceId: String(m.trackId.conferenceId),
        } : undefined,
        role: m.role,
    }));
};

/**
 * Check if user is sub-manager of a track
 */
const isTrackSubManager = async (userId, trackId) => {
    const membership = await trackMemberRepository.findByTrackAndUser(trackId, userId);
    return !!membership && membership.status === 'ACTIVE';
};

module.exports = {
    addMemberToTrack,
    removeMemberFromTrack,
    listTrackMembers,
    listTrackMembersByConference,
    getUserTracks,
    isTrackSubManager,
};
