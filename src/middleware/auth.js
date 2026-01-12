const jwt = require('jsonwebtoken');
const config = require('../config');
const logger = require('../config/logger');
const { ApiError } = require('../utils/errors');

const authenticate = (required = true) => (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    if (!required) {
      return next();
    }
    return next(new ApiError(401, 'UNAUTHORIZED', 'Authorization header missing'));
  }

  const [scheme, token] = authHeader.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return next(new ApiError(401, 'UNAUTHORIZED', 'Invalid authorization header'));
  }

  try {
    const payload = jwt.verify(token, config.jwt.secret);
    req.user = {
      userId: payload.sub,
      email: payload.email,
      orgId: payload.orgId,
      orgRoles: payload.orgRoles || [],
      conferenceRoles: payload.conferenceRoles || [],
      trackRoles: payload.trackRoles || [],
      globalRoles: payload.globalRoles || [],
    };
    return next();
  } catch (error) {
    logger.warn({ err: error, reqId: req.id }, 'Invalid token');
    if (!required) {
      return next();
    }
    return next(new ApiError(401, 'UNAUTHORIZED', 'Invalid or expired token'));
  }
};

module.exports = authenticate;
