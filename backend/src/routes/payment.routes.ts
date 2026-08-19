import { Router } from 'express';
import { stripeWebhook } from '../controllers/payment.controller';

const router = Router();

// Unprotected Stripe Webhook callback receiver
router.post('/webhook', stripeWebhook);

export default router;
