import { Document, Model, Types } from 'mongoose';

export interface IUser extends Document {
  _id: Types.ObjectId;
  name: string;
  email: string;
  password?: string;
  role: 'CUSTOMER' | 'PROVIDER' | 'ADMIN';
  phone?: string;
  businessName?: string;
  stripeAccountId?: string;
  isStripeReady?: boolean;
  stripeDetailsSubmitted?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserMethods {
  comparePassword(candidatePassword: string): Promise<boolean>;
  generateAccessToken(): string;
  generateRefreshToken(): string;
}

export type UserModel = Model<IUser, {}, IUserMethods>;
