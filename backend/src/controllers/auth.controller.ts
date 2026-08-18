import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { User } from '../models/User';
import { Session } from '../models/Session';
import { ApiError } from '../utils/ApiError';
import { ApiResponse } from '../utils/ApiResponse';
import { asyncHandler } from '../utils/asyncHandler';

// Secure cookie configuration
const getCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
});

// Helper function to SHA256-hash a refresh token string before saving to database
const hashToken = (token: string): string => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

/**
 * Helper to generate new Access & Refresh tokens, record refresh token in DB,
 * and attach the refresh token cookie onto the HTTP response.
 */
const generateAndSendTokens = async (user: any, req: Request, res: Response) => {
  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();
  const refreshTokenHash = hashToken(refreshToken);

  // Record session in DB
  await Session.create({
    userId: user._id,
    refreshTokenHash,
    userAgent: req.headers['user-agent'],
    ipAddress: req.ip,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
  });

  res.cookie('refreshToken', refreshToken, getCookieOptions());

  return accessToken;
};

/**
 * Registers a new Customer, Provider/Seller, or Admin.
 */
export const register = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, password, role, phone, businessName } = req.body;

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new ApiError(409, 'Email already registered');
  }

  // Create new user (pre-save hook hashes the password)
  const user = await User.create({
    name,
    email,
    password,
    role: role || 'CUSTOMER',
    phone,
    businessName: businessName,
  });

  const accessToken = await generateAndSendTokens(user, req, res);

  const createdUser = {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone,
    businessName: user.businessName,
    createdAt: user.createdAt,
  };

  res
    .status(201)
    .json(new ApiResponse(201, { user: createdUser, accessToken }, 'User registered successfully'));
});

/**
 * Authenticates login credentials and creates a new login Session.
 */
export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  // Retrieve select-gated password for verification
  const user = await User.findOne({ email }).select('+password');
  if (!user) {
    // Prevent account enumeration by returning a generic 401
    throw new ApiError(401, 'Invalid email or password');
  }

  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const accessToken = await generateAndSendTokens(user, req, res);

  const loggedInUser = {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone,
    businessName: user.businessName,
    createdAt: user.createdAt,
  };

  res
    .status(200)
    .json(new ApiResponse(200, { user: loggedInUser, accessToken }, 'Logged in successfully'));
});

/**
 * Performs token rotation: issues new access/refresh tokens and detects reuse.
 */
export const refreshAccessToken = asyncHandler(async (req: Request, res: Response) => {
  const incomingRefreshToken = req.cookies?.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, 'Refresh token required');
  }

  const refreshSecret = process.env.JWT_REFRESH_SECRET;
  if (!refreshSecret) {
    throw new ApiError(500, 'Server configuration error: JWT_REFRESH_SECRET is missing.');
  }

  try {
    // Validate token signature and expiry
    const decoded = jwt.verify(incomingRefreshToken, refreshSecret) as { _id: string };
    const incomingHash = hashToken(incomingRefreshToken);

    // 1. REUSE DETECTION: Check if token has already been rotated (exists in used hashes)
    const compromisedSession = await Session.findOne({ usedTokenHashes: incomingHash });
    if (compromisedSession) {
      // Invalidate ALL sessions for this user due to compromised token reuse
      await Session.updateMany(
        { userId: compromisedSession.userId },
        { $set: { revokedAt: new Date() } }
      );
      res.clearCookie('refreshToken', getCookieOptions());
      throw new ApiError(401, 'Invalid or expired refresh token');
    }

    // 2. Locate active session by matching active hash
    const session = await Session.findOne({
      refreshTokenHash: incomingHash,
      revokedAt: { $exists: false },
      expiresAt: { $gt: new Date() },
    });

    if (!session) {
      throw new ApiError(401, 'Invalid or expired refresh token');
    }

    const user = await User.findById(decoded._id);
    if (!user) {
      throw new ApiError(401, 'Invalid or expired refresh token');
    }

    // Generate new access and refresh token pair (Rotation)
    const newAccessToken = user.generateAccessToken();
    const newRefreshToken = user.generateRefreshToken();
    const newRefreshTokenHash = hashToken(newRefreshToken);

    // Push current hash to history and rotate to new active hash
    session.usedTokenHashes.push(incomingHash);
    session.refreshTokenHash = newRefreshTokenHash;
    session.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // extension
    await session.save();

    // Set new rotated token in cookie
    res.cookie('refreshToken', newRefreshToken, getCookieOptions());

    res
      .status(200)
      .json(new ApiResponse(200, { accessToken: newAccessToken }, 'Access token refreshed successfully'));
  } catch (error: any) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(401, 'Invalid or expired refresh token');
  }
});

/**
 * Revokes the current Session and clears the refresh cookie.
 */
export const logout = asyncHandler(async (req: Request, res: Response) => {
  const incomingRefreshToken = req.cookies?.refreshToken || req.body.refreshToken;

  if (incomingRefreshToken) {
    const incomingHash = hashToken(incomingRefreshToken);
    // Invalidate the session
    await Session.findOneAndUpdate(
      { refreshTokenHash: incomingHash },
      { $set: { revokedAt: new Date() } }
    );
  }

  // Clear HTTP cookie
  res.clearCookie('refreshToken', getCookieOptions());

  // Return standard success showing logout operation status code (204) in JSON payload
  res
    .status(200)
    .json(new ApiResponse(200, {}, 'Logged out successfully'));
});

/**
 * Retrieves authenticated User profile data.
 */
export const getCurrentUser = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user;
  if (!user) {
    throw new ApiError(401, 'Unauthorized request: User context missing.');
  }

  const profile = {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone,
    businessName: user.businessName,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };

  res
    .status(200)
    .json(new ApiResponse(200, { user: profile }, 'User profile retrieved successfully'));
});
