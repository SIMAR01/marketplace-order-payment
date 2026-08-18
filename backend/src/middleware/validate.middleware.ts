import { Request, Response, NextFunction, RequestHandler } from 'express';
import { AnyZodObject } from 'zod';

/**
 * Express middleware that validates the request body against a Zod schema.
 * Automatically forwards ZodError instances to next() to be processed by the errorHandler.
 */
export const validate = (schema: AnyZodObject): RequestHandler => {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      next(error);
    }
  };
};
