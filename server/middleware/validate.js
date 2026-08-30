/**
 * Generic Zod-schema-validating middleware factory. Rejects the request with
 * a clean, uniform-envelope 400 before it ever reaches a controller/service
 * if req.body fails the given schema — mutation routes must never hand a
 * raw, unvalidated body to a database service (coding-standard.md 5.1).
 */
const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);

  if (!result.success) {
    const errorDetails = {};
    result.error.issues.forEach((issue) => {
      const field = issue.path.join('.') || 'body';
      errorDetails[field] = issue.message;
    });

    const error = new Error('Validation failed. Please verify your input parameters.');
    error.statusCode = 400;
    error.errorDetails = errorDetails;
    return next(error);
  }

  req.body = result.data;
  next();
};

module.exports = validate;
