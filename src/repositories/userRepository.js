const User = require('../models/user.model');

const createUser = async (data) => User.create(data);

const findByEmail = async (email) => User.findOne({ email: email.toLowerCase(), isDeleted: false });

const findById = async (id) => User.findOne({ _id: id, isDeleted: false });

const listUsers = async (filter = {}, options = {}) =>
  User.find({ ...filter, isDeleted: false }, null, options).lean();

module.exports = {
  createUser,
  findByEmail,
  findById,
  listUsers,
};
