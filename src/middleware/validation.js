const { ZodError } = require('zod');
const { ApiError } = require('../utils/errors');

const validate = (schemas = {}) => (req, res, next) => {
  console.log('content-type:', req.headers['content-type']);
  console.log('body:', req.body);
  try {
    if (schemas.body) {
      req.body = schemas.body.parse(req.body);
    }
    if (schemas.query) {
      req.query = schemas.query.parse(req.query);
    }
    if (schemas.params) {
      req.params = schemas.params.parse(req.params);
    }
    return next();
  } catch (error) {
    if (error instanceof ZodError) {
      const issues = error.issues || error.errors || [];
      const details = issues.map((issue) => ({
        path: issue.path.join('.'),
        code: issue.code,
        message: issue.message,
        expected: issue.expected,
        received: issue.received,
      }));
      return next(new ApiError(400, 'VALIDATION_ERROR', 'Validation failed', details));
    }
    return next(error);
  }
};

module.exports = validate;
