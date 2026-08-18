import mongoose from 'mongoose';

/**
 * Connects Express to MongoDB database using Mongoose.
 * Shuts down application cleanly if MONGODB_URI is not set or connectivity fails.
 */
export const connectDB = async (): Promise<void> => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('CRITICAL: MONGODB_URI environment variable is missing.');
    process.exit(1);
  }

  try {
    await mongoose.connect(uri);
    console.log('Successfully connected to MongoDB.');
  } catch (error) {
    console.error('CRITICAL: Failed to establish database connection:', error);
    process.exit(1);
  }
};
