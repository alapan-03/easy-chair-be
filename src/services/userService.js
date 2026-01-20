const {
  getUsersConferences,
} = require("../repositories/conferenceMemberRepository");
const userRepository = require("../repositories/userRepository");

const listUsers = async ({ search } = {}) => {
  const filter = {};
  if (search) {
    const regex = new RegExp(search, "i");
    filter.$or = [{ name: regex }, { email: regex }];
  }

  const users = await userRepository.listUsers(filter, { sort: { name: 1 } });
  return users.map((u) => ({
    id: u._id,
    name: u.name,
    email: u.email,
    status: u.status,
  }));
};

const getAllUsersConferences = async ({ search, userId }) => {
  const filter = {};
  if (search) {
    const regex = new RegExp(search, "i");
    filter.$or = [{ name: regex }, { email: regex }];
  }

  const memberships = getUsersConferences(userId, filter);

  return memberships;
};

module.exports = {
  listUsers,
  getAllUsersConferences
};
