const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'An unexpected error occurred on the server.';
  let errorDetails = err.errorDetails || {};

  // Log error stack for debugging (in non-production environments)
  console.error(`[API Error] ${req.method} ${req.url} - Status: ${statusCode} - ${message}`);
  if (err.stack && process.env.NODE_ENV !== 'production') {
    console.error(err.stack);
  }

  // Handle Mongoose Validation Error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed. Please verify your input parameters.';
    errorDetails = {};
    for (const field in err.errors) {
      errorDetails[field] = err.errors[field].message;
    }
  }

  // Handle Mongoose Duplicate Key (Unique constraint) Error
  if (err.code === 11000) {
    statusCode = 400;
    const duplicateField = Object.keys(err.keyValue)[0];
    message = `The field value for ${duplicateField} already exists and must be unique.`;
    errorDetails = { [duplicateField]: 'This value is already registered.' };
  }

  // Handle JSON Web Token Errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Authentication failed. Invalid token.';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Authentication failed. Token has expired.';
  }

  // Return standard JSON error envelope (Section 6.2 of Coding Standards)
  res.status(statusCode).json({
    success: false,
    message,
    errorDetails: Object.keys(errorDetails).length > 0 ? errorDetails : undefined
  });
};

module.exports = errorHandler;
