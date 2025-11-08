/**
 * Error Handler Utilities
 * Consistent error handling across the application
 */

/**
 * Standard error response handler
 * 
 * @param {Error} error - Error object
 * @param {string} context - Context where error occurred (e.g., 'Get employees')
 * @returns {Object} Error response object
 */
export const handleError = (error, context = 'Operation') => {
  console.error(`${context} error:`, error);
  
  // Return user-friendly error message
  return {
    error: error.message || 'Server error',
    context: context
  };
};

/**
 * Validation error handler
 * 
 * @param {Array} errors - Validation errors array
 * @returns {Object} Error response object
 */
export const handleValidationError = (errors) => {
  return {
    error: 'Validation failed',
    errors: errors
  };
};

/**
 * Not found error handler
 * 
 * @param {string} resource - Resource name (e.g., 'Employee', 'User')
 * @returns {Object} Error response object
 */
export const handleNotFoundError = (resource = 'Resource') => {
  return {
    error: `${resource} not found`
  };
};

/**
 * Unauthorized error handler
 * 
 * @param {string} message - Custom error message
 * @returns {Object} Error response object
 */
export const handleUnauthorizedError = (message = 'Unauthorized') => {
  return {
    error: message
  };
};

/**
 * Forbidden error handler
 * 
 * @param {string} message - Custom error message
 * @returns {Object} Error response object
 */
export const handleForbiddenError = (message = 'Forbidden: Insufficient permissions') => {
  return {
    error: message
  };
};

