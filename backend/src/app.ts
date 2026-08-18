import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import authRouter from './routes/auth.routes';
import { errorHandler } from './middleware/error.middleware';

const app = express();

// Wire credentials-supported CORS and body parsers
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// API Authentication Routes
app.use('/api/auth', authRouter);

// Public health endpoint
app.get('/api/health', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'API is healthy',
  });
});

// Centralized error interceptor middleware (Must be last)
app.use(errorHandler);

export default app;
