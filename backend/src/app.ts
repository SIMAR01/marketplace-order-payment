import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import authRouter from './routes/auth.routes';
import productRouter from './routes/product.routes';
import cartRouter from './routes/cart.routes';
import paymentRouter from './routes/payment.routes';
import orderRouter from './routes/order.routes';
import cronRouter from './routes/cron.routes';
import stripeConnectRouter from './routes/providerStripe.routes';
import { errorHandler } from './middleware/error.middleware';

const app = express();

// Wire credentials-supported CORS and body parsers
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true,
  })
);

// Parse raw body for Stripe webhook before general JSON parsing
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));

// Capture standard JSON body for other routes
app.use(express.json());
app.use(cookieParser());

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/products', productRouter);
app.use('/api/cart', cartRouter);
app.use('/api/payments', paymentRouter);
app.use('/api/orders', orderRouter);
app.use('/api/cron', cronRouter);
app.use('/api/stripe', stripeConnectRouter);

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
