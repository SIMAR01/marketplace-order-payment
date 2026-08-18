import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { ApiError } from '../utils/ApiError';
import { ZodError } from 'zod';

/**
 * Centralized error handler middleware for Express applications.
 * Formats custom ApiErrors, Mongo duplicate keys, Zod validators, and JWT failures.
 * Returns statusCode both in the response headers and in the JSON body payload.
 */
export const errorHandler: ErrorRequestHandler = (
  error: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  let statusCode = error.statusCode || 500;
  let message = error.message || 'Internal Server Error';
  let errors: any[] = error.errors || [];

  // Intercept Zod Schema validation failures
  if (error instanceof ZodError) {
    statusCode = 400;
    message = 'Validation Error';
    errors = error.errors.map((err) => ({
      field: err.path.join('.'),
      message: err.message,
    }));
  }

  // Intercept MongoDB Unique index duplicate exceptions
  if (error.code === 11000) {
    statusCode = 409;
    const duplicatedField = error.keyValue ? Object.keys(error.keyValue)[0] : 'field';
    message = `${duplicatedField.charAt(0).toUpperCase() + duplicatedField.slice(1)} already exists.`;
  }

  // Intercept JWT parsing failures
  if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token signature. Unauthorized access.';
  }

  // Intercept JWT Expiry exceptions
  if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token has expired';
  }

  const responsePayload = {
    success: false,
    statusCode, // Transmit status code explicitly in JSON response body
    message,
    errors,
    ...(process.env.NODE_ENV === 'development' ? { stack: error.stack } : {}),
  };

  res.status(statusCode).json(responsePayload);
};
