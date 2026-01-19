class ApiError extends Error {
  constructor(statusCode = 500, code = 'INTERNAL_ERROR', message = 'Internal Server Error', details) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

class NotFoundError extends ApiError {
  constructor(message = 'Resource not found', details) {
    super(404, 'NOT_FOUND', message, details);
    this.name = 'NotFoundError';
  }
}

class ForbiddenError extends ApiError {
  constructor(message = 'Access forbidden', details) {
    super(403, 'FORBIDDEN', message, details);
    this.name = 'ForbiddenError';
  }
}

class BadRequestError extends ApiError {
  constructor(message = 'Bad request', details) {
    super(400, 'BAD_REQUEST', message, details);
    this.name = 'BadRequestError';
  }
}

module.exports = {
  ApiError,
  NotFoundError,
  ForbiddenError,
  BadRequestError,
};
