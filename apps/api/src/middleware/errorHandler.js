const { HTTP_STATUS } = require('../constants');

/**
 * Enterprise Centralized Error Handler
 * Standardizes API error responses and prevents leaking stack traces or internal DB errors directly.
 */
module.exports = function errorHandler(err, req, res, next) {
  // Log the raw error for internal observability
  console.error(`[API Error] ${req.method} ${req.url}`, err);
  const statusCode = err.status || HTTP_STATUS.INTERNAL_ERROR;
  const message = (err.expose || statusCode < 500) ? err.message : 'An unexpected internal server error occurred.';

  res.status(statusCode).send({
    error: {
      message,
      // In a real enterprise app, we'd include error codes, trace IDs, etc.
      code: err.code || 'INTERNAL_ERROR',
      status: statusCode
    }
  });
};
