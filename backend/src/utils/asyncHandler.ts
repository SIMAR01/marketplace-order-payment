import { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * A higher-order function that wraps Express request handlers
 * to catch asynchronous errors and forward them to next().
 */
export const asyncHandler = (requestHandler: (req: Request, res: Response, next: NextFunction) => any): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(requestHandler(req, res, next)).catch((error) => next(error));
  };
};
