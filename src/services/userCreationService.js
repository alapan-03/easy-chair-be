const bcrypt = require("bcryptjs");
const { ApiError } = require("../utils/errors");
const { Roles } = require("../constants/roles");

const userRepository = require("../repositories/userRepository");
const orgMemberRepository = require("../repositories/orgMemberRepository");
const conferenceMemberRepository = require("../repositories/conferenceMemberRepository");
const trackMemberRepository = require("../repositories/trackMemberRepository");

const conferenceRepository = require("../repositories/conferenceRepository");
const trackRepository = require("../repositories/trackRepository");
const organizationRepository = require("../repositories/organizationRepository");

/**
 * Create a new user with credentials and assign role
 * Enforces hierarchical permission: only higher roles can create lower roles
 */
const createUserWithRole = async (creatorUser, userData, roleAssignment) => {
  const { email, password, name } = userData;
  const { role, orgId, conferenceId, trackId, managesFullConference } =
    roleAssignment;

  const normalizedEmail = email.toLowerCase().trim();

  const existingUser = await userRepository.findByEmail(normalizedEmail);
  if (existingUser) {
    throw new ApiError(
      409,
      "USER_EXISTS",
      "A user with this email already exists",
    );
  }

  await validateCreationPermission(creatorUser, role, orgId, conferenceId);

  await validateAssignmentTarget(role, orgId, conferenceId, trackId);

  const passwordHash = await bcrypt.hash(password, 10);

  const newUser = await userRepository.createUser({
    email: normalizedEmail,
    name,
    authProvider: "local",
    passwordHash,
    status: "ACTIVE",
  });

  let membership;

  /**
   * ADMIN / MANAGER → org level
   */
  if (role === Roles.ADMIN || role === Roles.MANAGER) {
    membership = await orgMemberRepository.addMember({
      orgId,
      userId: newUser._id,
      role,
      status: "ACTIVE",
    });
  }

  /**
   * MANAGER → conference manager
   */
  if (role === Roles.MANAGER && conferenceId) {
    await conferenceMemberRepository.addMember({
      orgId,
      conferenceId,
      userId: newUser._id,
      role: Roles.MANAGER,
      assignedBy: creatorUser.userId,
      managesFullConference: true,
    });
  }

  /**
   * SUB_MANAGER
   */
  if (role === Roles.SUB_MANAGER) {
    if (trackId) {
      const track = await trackRepository.findById(trackId);

      await trackMemberRepository.addMember({
        orgId: track.orgId,
        conferenceId: track.conferenceId,
        trackId,
        userId: newUser._id,
        role: Roles.SUB_MANAGER,
        assignedBy: creatorUser.userId,
      });
    } else if (conferenceId) {
      const conference = await conferenceRepository.findById(conferenceId);

      await conferenceMemberRepository.addMember({
        orgId: conference.orgId,
        conferenceId,
        userId: newUser._id,
        role: Roles.SUB_MANAGER,
        assignedBy: creatorUser.userId,
        managesFullConference: managesFullConference !== false,
      });
    }
  }

  /**
   * REVIEWER
   * Track reviewer OR Conference reviewer
   */
  if (role === Roles.REVIEWER) {
    // Track reviewer
    if (trackId) {
      const track = await trackRepository.findById(trackId);

      await trackMemberRepository.addMember({
        orgId: track.orgId,
        conferenceId: track.conferenceId,
        trackId,
        userId: newUser._id,
        role: Roles.REVIEWER,
        assignedBy: creatorUser.userId,
      });
    }

    // Conference reviewer
    else if (conferenceId) {
      const conference = await conferenceRepository.findById(conferenceId);

      await conferenceMemberRepository.addMember({
        orgId: conference.orgId,
        conferenceId,
        userId: newUser._id,
        role: Roles.REVIEWER,
        assignedBy: creatorUser.userId,
      });
    }
  }

  return {
    user: {
      id: newUser._id,
      email: newUser.email,
      name: newUser.name,
    },
    role,
    assignment: {
      orgId,
      conferenceId,
      trackId,
    },
  };
};

/**
 * Validate role creation permission
 */
const validateCreationPermission = async (
  creatorUser,
  targetRole,
  orgId,
  conferenceId,
) => {
  const isSuperAdmin = (creatorUser.globalRoles || []).includes(
    Roles.SUPER_ADMIN,
  );

  if (targetRole === Roles.ADMIN) {
    if (!isSuperAdmin) {
      throw new ApiError(
        403,
        "FORBIDDEN",
        "Only Super Admin can create Admin users",
      );
    }
    return;
  }

  const creatorOrgRole = (creatorUser.orgRoles || []).find(
    (r) => String(r.orgId) === String(orgId),
  )?.role;

  /**
   * MANAGER
   */
  if (targetRole === Roles.MANAGER) {
    if (!isSuperAdmin && creatorOrgRole !== Roles.ADMIN) {
      throw new ApiError(
        403,
        "FORBIDDEN",
        "Only Admin or Super Admin can create Manager users",
      );
    }
    return;
  }

  /**
   * SUB_MANAGER
   */
  if (targetRole === Roles.SUB_MANAGER) {
    if (isSuperAdmin || creatorOrgRole === Roles.ADMIN) {
      return;
    }

    if (conferenceId) {
      const creatorConferenceRole = (creatorUser.conferenceRoles || []).find(
        (r) => String(r.conferenceId) === String(conferenceId),
      )?.role;

      if (
        creatorOrgRole === Roles.MANAGER ||
        creatorConferenceRole === Roles.MANAGER
      ) {
        return;
      }
    }

    throw new ApiError(
      403,
      "FORBIDDEN",
      "Only Manager, Admin, or Super Admin can create Sub-manager users",
    );
  }

  /**
   * REVIEWER
   */
  if (targetRole === Roles.REVIEWER) {
    if (isSuperAdmin || creatorOrgRole === Roles.ADMIN) {
      return;
    }

    if (conferenceId) {
      const creatorConferenceRole = (creatorUser.conferenceRoles || []).find(
        (r) => String(r.conferenceId) === String(conferenceId),
      )?.role;

      if (
        creatorOrgRole === Roles.MANAGER ||
        creatorConferenceRole === Roles.MANAGER
      ) {
        return;
      }
    }

    throw new ApiError(
      403,
      "FORBIDDEN",
      "Only Manager, Admin, or Super Admin can create Reviewer users",
    );
  }

  throw new ApiError(
    400,
    "INVALID_ROLE",
    `Cannot create user with role: ${targetRole}`,
  );
};

/**
 * Validate assignment targets
 */
const validateAssignmentTarget = async (role, orgId, conferenceId, trackId) => {
  if ((role === Roles.ADMIN || role === Roles.MANAGER) && !orgId) {
    throw new ApiError(
      400,
      "VALIDATION_ERROR",
      "Organization ID is required for Admin/Manager role",
    );
  }

  if (orgId) {
    const org = await organizationRepository.findById(orgId);
    if (!org) {
      throw new ApiError(404, "ORG_NOT_FOUND", "Organization not found");
    }
  }

  /**
   * SUB_MANAGER validation
   */
  if (role === Roles.SUB_MANAGER && !conferenceId && !trackId) {
    throw new ApiError(
      400,
      "VALIDATION_ERROR",
      "Conference ID or Track ID is required for Sub-manager role",
    );
  }

  /**
   * REVIEWER validation
   */
  if (role === Roles.REVIEWER && !conferenceId && !trackId) {
    throw new ApiError(
      400,
      "VALIDATION_ERROR",
      "Conference ID or Track ID is required for Reviewer role",
    );
  }

  if (conferenceId) {
    const conference = await conferenceRepository.findById(conferenceId);
    if (!conference) {
      throw new ApiError(404, "CONFERENCE_NOT_FOUND", "Conference not found");
    }
  }

  if (trackId) {
    const track = await trackRepository.findById(trackId);
    if (!track) {
      throw new ApiError(404, "TRACK_NOT_FOUND", "Track not found");
    }
  }
};

module.exports = {
  createUserWithRole,
};
