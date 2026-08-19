import mongoose from 'mongoose';

/**
 * Connects Express to MongoDB database using Mongoose.
 * Shuts down application cleanly if MONGODB_URI is not set or connectivity fails.
 */
export const connectDB = async (): Promise<void> => {
  let uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('CRITICAL: MONGODB_URI environment variable is missing.');
    process.exit(1);
  }

  let connectionSuccess = false;
  try {
    await mongoose.connect(uri);
    connectionSuccess = true;
    console.log('Successfully connected to MongoDB.');
  } catch (error: any) {
    if (uri.includes('mongodb://mongodb:') &&
      (error.message?.includes('ENOTFOUND') ||
        error.name === 'MongooseServerSelectionError' ||
        String(error).includes('ENOTFOUND'))) {
      const fallbackUri = uri.replace('mongodb://mongodb:', 'mongodb://localhost:');
      console.log(`Could not resolve 'mongodb' hostname. Retrying with fallback: ${fallbackUri}`);
      try {
        await mongoose.connect(fallbackUri);
        uri = fallbackUri;
        connectionSuccess = true;
        console.log('Successfully connected to MongoDB using fallback URI.');
      } catch (fallbackError) {
        console.error('CRITICAL: Failed to establish database connection with fallback:', fallbackError);
        process.exit(1);
      }
    } else {
      console.error('CRITICAL: Failed to establish database connection:', error);
      process.exit(1);
    }
  }

  if (connectionSuccess) {
    // Auto-clean stale indexes from old schemas if they exist to prevent duplicate key errors
    try {
      const db = mongoose.connection.db;
      if (db) {
        const collections = await db.listCollections().toArray();
        if (collections.some((c: any) => c.name === 'payments')) {
          await db.collection('payments').dropIndexes();
          console.log('Dropped stale payment indexes successfully.');
        }
        if (collections.some((c: any) => c.name === 'orders')) {
          await db.collection('orders').dropIndexes();
          console.log('Dropped stale order indexes successfully.');
        }
      }
    } catch (indexErr: any) {
      console.warn('Non-fatal: Failed to drop stale indexes:', indexErr.message);
    }
  }
};
