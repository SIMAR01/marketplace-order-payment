import { Router } from 'express';
import { verifyJWT } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { createPaymentIntentSchema } from '../validators/payment.schema';
import { createPaymentIntent, stripeWebhook } from '../controllers/payment.controller';

const router = Router();

// Gated payment intent creation
router.post('/create-intent', verifyJWT, validate(createPaymentIntentSchema), createPaymentIntent);

// Unprotected Stripe webhook callback receiver
router.post('/webhook', stripeWebhook);

export default router;
