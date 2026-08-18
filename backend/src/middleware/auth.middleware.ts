import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';

interface JwtPayload {
  _id: string;
  role: string;
}

/**
 * Middleware that authenticates request accessing routes via short-lived JWT.
 * Extracts token from HTTP cookies or Bearer token header.
 */
export const verifyJWT = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  const token =
    req.cookies?.accessToken ||
    req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    throw new ApiError(401, 'Unauthorized: Access token is missing.');
  }

  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) {
    throw new ApiError(500, 'Server configuration error: JWT_ACCESS_SECRET is missing.');
  }

  try {
    const decoded = jwt.verify(token, secret) as JwtPayload;

    // Retrieve user and select password/tokens out
    const user = await User.findById(decoded._id);
    if (!user) {
      throw new ApiError(401, 'Unauthorized: Invalid access token or user not found.');
    }

    req.user = user;
    next();
  } catch (error) {
    throw new ApiError(401, 'Unauthorized: Token is invalid or expired.');
  }
});
