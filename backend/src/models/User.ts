import { Schema, model } from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { IUser, IUserMethods, UserModel } from '../types/user.interface';

// Mongoose User Schema
const userSchema = new Schema<IUser, UserModel, IUserMethods>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    role: {
      type: String,
      enum: ['CUSTOMER', 'PROVIDER', 'ADMIN'],
      default: 'CUSTOMER',
    },
    phone: {
      type: String,
      trim: true,
    },
    businessName: {
      type: String,
      trim: true,
    },
    stripeAccountId: {
      type: String,
      unique: true,
      sparse: true,
    },
    isStripeReady: {
      type: Boolean,
      default: false,
    },
    stripeDetailsSubmitted: {
      type: Boolean,
      default: false,
    }
  },
  {
    timestamps: true,
  }
);

// Hash password before saving to the database
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error: any) {
    next(error);
  }
});

// Compare password candidate with stored hash
userSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

// Generate Access Token (signed with secret)
userSchema.methods.generateAccessToken = function (): string {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) {
    throw new Error('JWT_ACCESS_SECRET is not defined in environment variables.');
  }
  const expiresIn = process.env.JWT_ACCESS_EXPIRES_IN || '3h';
  return jwt.sign(
    { _id: this._id, role: this.role },
    secret,
    { expiresIn }
  );
};

// Generate Refresh Token (signed with secret)
userSchema.methods.generateRefreshToken = function (): string {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) {
    throw new Error('JWT_REFRESH_SECRET is not defined in environment variables.');
  }
  const expiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
  return jwt.sign(
    { _id: this._id },
    secret,
    { expiresIn }
  );
};

export const User = model<IUser, UserModel>('User', userSchema);
