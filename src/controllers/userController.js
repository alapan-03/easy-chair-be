const Roles = require("../constants/roles");
const userService = require("../services/userService");
const { ApiError } = require("../utils/errors");

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
  const id = req.user.userId
  const conferences = await userService.getAllUsersConferences({ search: req.query.search, userId: id });
  res.json({ data: conferences });
};

module.exports = {
  listUsers,
  getAllUsersConferences
};
