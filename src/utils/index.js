const mongoose = require("mongoose");
const { Types } = mongoose;

const toObjectId = (value) => {
  if (!value) return value;

  // already ObjectId
  if (value instanceof Types.ObjectId) return value;

  // populated doc
  if (typeof value === "object" && value._id) {
    return new Types.ObjectId(String(value._id));
  }

  // string id
  if (Types.ObjectId.isValid(value)) {
    return new Types.ObjectId(String(value));
  }

  return value;
};

const normalizeIds = (arr = []) =>
  arr
    .map((item) => toObjectId(item))
    .filter(Boolean);

const buildAggregateMatch = (submissionMatch) => {
  const match = { ...submissionMatch };

  if (match.orgId) match.orgId = toObjectId(match.orgId);
  if (match.conferenceId && match.conferenceId.$in) {
    match.conferenceId = {
      ...match.conferenceId,
      $in: normalizeIds(match.conferenceId.$in),
    };
  } else if (match.conferenceId) {
    match.conferenceId = toObjectId(match.conferenceId);
  }

  if (match.trackId && match.trackId.$in) {
    match.trackId = {
      ...match.trackId,
      $in: normalizeIds(match.trackId.$in),
    };
  } else if (match.trackId) {
    match.trackId = toObjectId(match.trackId);
  }

  if (match.createdByUserId) {
    match.createdByUserId = toObjectId(match.createdByUserId);
  }

  if (Array.isArray(match.$or)) {
    match.$or = match.$or.map((condition) =>
      buildAggregateMatch(condition)
    );
  }

  return match;
};


module.exports = buildAggregateMatch