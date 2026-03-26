const Roles = require("../constants/roles");
const userService = require("../services/userService");
const { ApiError } = require("../utils/errors");
const { SubmissionStatuses } = require("../constants/submissionStatuses");
const submissionModel = require("../models/submission.model");
const Certificate = require("../models/certifcate.model");
const conferenceMemberModel = require("../models/conferenceMember.model");

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

const dashboardData = async (req, res) => {
  try {
    const userId = req.user.userId;

    // 🔹 Get all memberships
    const memberships = await ConferenceMember.find({
      userId,
      isDeleted: false,
      status: "ACTIVE",
    }).select("conferenceId role");

    const conferenceIds = memberships.map((m) => m.conferenceId);
    const roles = [...new Set(memberships.map((m) => m.role))];

    // 🔥 Build dynamic query based on role
    let submissionMatch = {
      conferenceId: { $in: conferenceIds },
      isDeleted: false,
    };

    // 👇 ROLE-BASED FILTERING
    if (roles.includes("AUTHOR")) {
      submissionMatch.createdByUserId = userId;
    }

    // (Later you can extend reviewer logic)
    // if (roles.includes("REVIEWER")) {
    //   submissionMatch.assignedReviewerId = userId;
    // }

    // 🔹 Submissions stats
    const submissionStats = await Submission.aggregate([
      { $match: submissionMatch },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
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
      }
    });

    // 🔹 Certificates
    const certificatesCount = await Certificate.countDocuments({
      userId,
      isDeleted: false,
      status: "ISSUED",
    });

    // 🔹 Recent submissions (same role filter)
    const recentSubmissions = await Submission.find(submissionMatch)
      .sort({ createdAt: -1 })
      .limit(5)
      .select("metadata.title status createdAt");

    // 🔹 Total conferences
    const totalConferences = conferenceIds.length;

    // 🔹 Role stats
    const roleStats = memberships.reduce((acc, m) => {
      acc[m.role] = (acc[m.role] || 0) + 1;
      return acc;
    }, {});

    // ✅ SAME RESPONSE for all roles
    res.json({
      success: true,
      data: {
        totalConferences,
        submissions: submissionCounts,
        certificates: certificatesCount,
        roles: roleStats,
        recentSubmissions,
      },
    });
  } catch (error) {
    console.error("Dashboard Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to load dashboard data",
    });
  }
};

module.exports = {
  listUsers,
  getAllUsersConferences,
  dashboardData,
};
