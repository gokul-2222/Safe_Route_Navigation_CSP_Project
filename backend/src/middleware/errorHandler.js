import { logger } from '../utils/logger.js';

export function errorHandler(err, req, res, next) {
  logger.error(`Error processing request to ${req.method} ${req.url}: ${err.message}`, err.stack || '');
  
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  
  // Don't expose internal error details in production
  const responseMessage = statusCode === 500 && process.env.NODE_ENV === 'production'
    ? 'An unexpected error occurred. Please try again.'
    : message;

  res.status(statusCode).json({
    status: 'error',
    statusCode,
    message: responseMessage
  });
}
