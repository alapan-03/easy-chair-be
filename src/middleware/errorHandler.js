const logger = require('../config/logger');
const { ApiError } = require('../utils/errors');

// eslint-disable-next-line no-unused-vars
module.exports = (err, req, res, next) => {
  const isApiError = err instanceof ApiError;
  const status = err.statusCode || err.status || 500;
  const code = err.code || (isApiError ? err.code : 'INTERNAL_ERROR');
  const message = err.message || 'Internal Server Error';
  const details = err.details || err.errors;

  logger.error({ err, reqId: req.id }, message);

  res.status(status).json({
    requestId: req.id,
    code: code || 'INTERNAL_ERROR',
    message,
    details,
  });
};
