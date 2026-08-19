import 'dotenv/config';
import app from './app';
import { connectDB } from './config/db';

const port = process.env.PORT || 5000;

const startServer = async (): Promise<void> => {
  // Block server start until database is ready
  await connectDB();

  app.listen(port, () => {
    console.log(`Server is running in ${process.env.NODE_ENV || 'development'} mode on port ${port}`);
  });
};

startServer().catch((error) => {
  console.error('Fatal server initialization error:', error);
  process.exit(1);
});
