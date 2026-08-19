import { Router } from 'express';
import { verifyJWT } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { createPaymentIntentSchema } from '../validators/payment.schema';
import {
  createPaymentIntent,
  getOrders,
  releaseOrderPayout,
  requestOrderCancellation,
  updateOrderStatus,
  approveOrderRefund,
  verifyCheckoutSuccess,
} from '../controllers/payment.controller';

const router = Router();

// Checkout Intent Initialization (Takes providerId and shippingAddress)
router.post('/checkout-intent', verifyJWT, validate(createPaymentIntentSchema), createPaymentIntent);

// Fetch orders (retrieves customer orders, provider orders, or admin lists based on token claims)
router.get('/', verifyJWT, getOrders);

// Fallback Checkout Success Verification Endpoint (verifies direct with Stripe and clears cart)
router.get('/success/:orderId', verifyJWT, verifyCheckoutSuccess);

// Order Operations
router.post('/:orderId/cancel-request', verifyJWT, requestOrderCancellation);
router.post('/:orderId/release', verifyJWT, releaseOrderPayout);
router.post('/:orderId/status', verifyJWT, updateOrderStatus); // Provider logistics transit simulator
router.post('/:orderId/approve-refund', verifyJWT, approveOrderRefund); // Admin refund approval

export default router;
