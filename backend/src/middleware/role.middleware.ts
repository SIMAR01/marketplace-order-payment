import { Request, Response, NextFunction, RequestHandler } from 'express';
import { ApiError } from '../utils/ApiError';

/**
 * Reusable middleware that restricts route access based on user role parameters.
 * Throws 403 Forbidden on insufficient permissions.
 */
export const authorizeRoles = (...roles: ('CUSTOMER' | 'ADMIN')[]): RequestHandler => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new ApiError(401, 'Unauthorized: Credentials missing.'));
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new ApiError(403, `Access denied: insufficient permissions. Role '${req.user.role}' not permitted.`)
      );
    }

    next();
  };
};

/**
 * Dedicated middleware that restricts access strictly to users with the 'ADMIN' role.
 * Maps directly to the flow definitions in AUTH_FLOW.md.
 */
export const adminOnly = (req: Request, _res: Response, next: NextFunction) => {
  if (!req.user) {
    return next(new ApiError(401, 'Unauthorized: Credentials missing.'));
  }

  if (req.user.role !== 'ADMIN') {
    return next(
      new ApiError(403, "Access denied: insufficient permissions.")
    );
  }

  next();
};
