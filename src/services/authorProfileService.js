const authorProfileRepository = require('../repositories/authorProfileRepository');

const upsertProfile = async (orgId, userId, payload) => {
  return authorProfileRepository.updateOne(
    orgId,
    { userId },
    { $set: { ...payload, userId } },
    { upsert: true, setDefaultsOnInsert: true }
  );
};

const getProfile = async (orgId, userId) => {
  return authorProfileRepository.findOne(orgId, { userId });
};

module.exports = {
  upsertProfile,
  getProfile,
};
