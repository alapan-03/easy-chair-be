const Roles = require("../constants/roles");
const userService = require("../services/userService");
const { ApiError } = require("../utils/errors");
const { SubmissionStatuses } = require("../constants/submissionStatuses");
const conferenceModel = require("../models/conference.model");
const conferenceMemberModel = require("../models/conferenceMember.model");
const trackMemberModel = require("../models/trackMember.model");
const authorProfileModel = require("../models/authorProfile.model");
const Certificate = require("../models/certifcate.model");
const Submission = require('../models/submission.model');
const buildAggregateMatch = require("../utils");

const listUsers = async (req, res) => {
  const isSuperAdmin = (req.user.globalRoles || []).includes(Roles.SUPER_ADMIN);
  const isAdmin = (req.user.orgRoles || []).some((m) => m.role === Roles.ADMIN);
  if (!isSuperAdmin && !isAdmin) {
    throw new ApiError(403, "FORBIDDEN", "Admin access required to list users");
  }

  const users = await userService.listUsers({ search: req.query.search });
  res.json({ data: users });
};

const getAllUsersConferences = async (req, res) => {
  const id = req.user.userId;
  const conferences = await userService.getAllUsersConferences({
    search: req.query.search,
    userId: id,
  });
  res.json({ data: conferences });
};

const uniqIds = (arr = []) => {
  return [...new Set(arr.filter(Boolean).map((v) => String(v._id || v)))];
};

const addRoleCount = (obj, role, count = 1) => {
  if (!role) return;
  obj[role] = (obj[role] || 0) + count;
};

const extractPlatformRoles = (user = {}) => {
  const roles = new Set();

  // Example supported shapes:
  // req.user.roles = ["SUPER_ADMIN"]
  // req.user.orgRoles = ["ADMIN"]
  // req.user.orgRoles = [{ role: "ADMIN" }]
  // req.user.role = "ADMIN"
  if (user.role) roles.add(user.role);

  if (Array.isArray(user.roles)) {
    user.roles.forEach((r) => {
      if (typeof r === "string") roles.add(r);
      else if (r?.role) roles.add(r.role);
    });
  }

  if (Array.isArray(user.orgRoles)) {
    user.orgRoles.forEach((r) => {
      if (typeof r === "string") roles.add(r);
      else if (r?.role) roles.add(r.role);
    });
  }

  return roles;
};

const dashboardData = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { orgId } = req.tenant;
    const platformRoles = extractPlatformRoles(req.user);

    const baseOrgFilter = orgId ? { orgId } : {};

    // 1) Load memberships
    const [conferenceMemberships, trackMemberships, authorProfile] =
      await Promise.all([
        conferenceMemberModel
          .find({
            userId,
            isDeleted: false,
            status: "ACTIVE",
            ...baseOrgFilter,
          })
          .select("conferenceId role managesFullConference")
          .populate("conferenceId", "name")
          .lean(),

        trackMemberModel
          .find({
            userId,
            isDeleted: false,
            status: "ACTIVE",
            ...baseOrgFilter,
          })
          .select("conferenceId trackId role")
          .populate("conferenceId", "name")
          .lean(),

        orgId
          ? authorProfileModel.findOne({
              orgId,
              userId,
              isDeleted: false,
            })
              .select("_id name affiliation orcid")
              .lean()
          : null,
      ]);

    // 2) Derive role buckets
    const hasSuperAdmin = platformRoles.has("SUPER_ADMIN");
    const hasAdmin = platformRoles.has("ADMIN");

    const managerConferenceIds = uniqIds(
      conferenceMemberships
        .filter((m) => m.role === "MANAGER" && m.conferenceId)
        .map((m) => m.conferenceId),
    );

    const authorConferenceIds = uniqIds(
      conferenceMemberships
        .filter((m) => m.role === "AUTHOR" && m.conferenceId)
        .map((m) => m.conferenceId),
    );

    const reviewerConferenceIds = uniqIds(
      conferenceMemberships
        .filter((m) => m.role === "REVIEWER" && m.conferenceId)
        .map((m) => m.conferenceId),
    );

    const subManagerFullConferenceIds = uniqIds(
      conferenceMemberships
        .filter(
          (m) =>
            m.role === "SUB_MANAGER" &&
            m.managesFullConference === true &&
            m.conferenceId,
        )
        .map((m) => m.conferenceId),
    );

    const subManagerTrackIds = uniqIds(
      trackMemberships
        .filter((m) => m.role === "SUB_MANAGER" && m.trackId)
        .map((m) => m.trackId),
    );

    const membershipConferenceIds = uniqIds([
      ...conferenceMemberships.map((m) => m.conferenceId).filter(Boolean),
      ...trackMemberships.map((m) => m.conferenceId).filter(Boolean),
    ]);

    // 3) Also include conferences where the user has created submissions,
    // so plain USER / AUTHOR views still show their conferences properly.
    const ownSubmissionConferenceIds = await Submission.distinct(
      "conferenceId",
      {
        createdByUserId: userId,
        isDeleted: false,
        ...baseOrgFilter,
      },
    );

    // 4) Build submission access scope
    const reviewerVisibleStatuses = [
      SubmissionStatuses.SUBMITTED,
      SubmissionStatuses.UNDER_REVIEW,
      SubmissionStatuses.ACCEPTED,
      SubmissionStatuses.REJECTED,
    ];

    const isOrgWide = hasSuperAdmin || hasAdmin;

    let submissionMatch = {
      isDeleted: false,
      ...baseOrgFilter,
      createdByUserId: userId,
    };

    if (!isOrgWide) {
      const submissionOr = [];

      // Manager -> full access to their managed conferences
      if (managerConferenceIds.length) {
        submissionOr.push({
          conferenceId: { $in: managerConferenceIds },
        });
      }

      // Sub-manager with full conference access
      if (subManagerFullConferenceIds.length) {
        submissionOr.push({
          conferenceId: { $in: subManagerFullConferenceIds },
        });
      }

      // Sub-manager with track-level access only
      if (subManagerTrackIds.length) {
        submissionOr.push({
          trackId: { $in: subManagerTrackIds },
        });
      }

      // Reviewer -> non-draft submissions in reviewer conferences
      if (reviewerConferenceIds.length) {
        submissionOr.push({
          conferenceId: { $in: reviewerConferenceIds },
          status: { $in: reviewerVisibleStatuses },
        });
      }

      // Author -> own submissions in author conferences
      if (authorConferenceIds.length) {
        submissionOr.push({
          conferenceId: { $in: authorConferenceIds },
          createdByUserId: userId,
        });
      }

      // USER fallback and mixed-role personal visibility:
      // always allow them to see their own submissions
      submissionOr.push({
        createdByUserId: userId,
      });

      submissionMatch.$or = submissionOr;
    }

    // 5) Build certificate scope
    let certificateMatch = {
      isDeleted: false,
      status: "ISSUED",
      ...baseOrgFilter,
    };

    if (!isOrgWide) {
      const certificateOr = [];

      // Manager -> full conference certificates
      if (managerConferenceIds.length) {
        certificateOr.push({
          conferenceId: { $in: managerConferenceIds },
        });
      }

      // Sub-manager -> only when they manage full conference
      if (subManagerFullConferenceIds.length) {
        certificateOr.push({
          conferenceId: { $in: subManagerFullConferenceIds },
        });
      }

      // Everyone can see own certificates
      certificateOr.push({
        userId,
      });

      certificateMatch.$or = certificateOr;
    }

    // 6) Resolve accessible conferences for dashboard cards
    let accessibleConferences = [];

    if (isOrgWide) {
      accessibleConferences = await conferenceModel
        .find({
          isDeleted: false,
          ...baseOrgFilter,
        })
        .select("name")
        .lean();
    } else {
      const accessibleConferenceIds = uniqIds([
        ...membershipConferenceIds,
        ...ownSubmissionConferenceIds,
      ]);

      if (accessibleConferenceIds.length) {
        accessibleConferences = await conferenceModel
          .find({
            _id: { $in: accessibleConferenceIds },
            isDeleted: false,
            ...baseOrgFilter,
          })
          .select("name")
          .lean();
      }
    }

    const conferenceNames = accessibleConferences.map((c) => c.name);
    const totalConferences = accessibleConferences.length;

    const aggregateMatch = buildAggregateMatch(submissionMatch);
    // 7) Stats queries
    const [submissionStats, certificatesCount, recentSubmissions] =
      await Promise.all([
        Submission.aggregate([
          { $match: aggregateMatch },
          {
            $group: {
              _id: "$status",
              count: { $sum: 1 },
            },
          },
        ]),

        Certificate.countDocuments(certificateMatch),

        Submission
          .find(submissionMatch)
          .sort({ createdAt: -1 })
          .limit(5)
          .select("_id metadata.title status createdAt conferenceId trackId")
          .lean(),
      ]);

    const submissionCounts = {
      total: 0,
      draft: 0,
      submitted: 0,
      underReview: 0,
      accepted: 0,
      rejected: 0,
    };

    submissionStats.forEach((item) => {
      submissionCounts.total += item.count;

      switch (item._id) {
        case SubmissionStatuses.DRAFT:
          submissionCounts.draft = item.count;
          break;
        case SubmissionStatuses.SUBMITTED:
          submissionCounts.submitted = item.count;
          break;
        case SubmissionStatuses.UNDER_REVIEW:
          submissionCounts.underReview = item.count;
          break;
        case SubmissionStatuses.ACCEPTED:
          submissionCounts.accepted = item.count;
          break;
        case SubmissionStatuses.REJECTED:
          submissionCounts.rejected = item.count;
          break;
        default:
          break;
      }
    });

    // 8) Role stats
    const roleStats = {};

    // Platform-level roles
    platformRoles.forEach((role) => addRoleCount(roleStats, role, 1));

    // Conference memberships
    conferenceMemberships.forEach((m) => addRoleCount(roleStats, m.role, 1));

    // Track-based sub-manager info
    if (trackMemberships.length) {
      // keep SUB_MANAGER presence simple
      if (!roleStats.SUB_MANAGER) roleStats.SUB_MANAGER = 1;
    }

    // If no role at all, treat as USER
    if (Object.keys(roleStats).length === 0) {
      roleStats.USER = 1;
    }

    // 9) Response
    return res.json({
      success: true,
      data: {
        totalConferences,
        conferenceNames,
        submissions: submissionCounts,
        certificates: certificatesCount,
        roles: roleStats,
        recentSubmissions,

        // optional extras for richer dashboard UI
        meta: {
          authorProfileCompleted: !!authorProfile,
          trackAssignments: trackMemberships.length,
          scope: isOrgWide ? "ORG_WIDE" : "ROLE_SCOPED",
        },
      },
    });
  } catch (error) {
    console.error("Dashboard Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load dashboard data",
    });
  }
};

module.exports = {
  dashboardData,
};

module.exports = {
  listUsers,
  getAllUsersConferences,
  dashboardData,
};
