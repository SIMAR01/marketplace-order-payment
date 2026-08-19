import { Request, Response } from 'express';
import { Types } from 'mongoose';
import Stripe from 'stripe';
import { Cart } from '../models/Cart';
import { Product } from '../models/Product';
import { User } from '../models/User';
import { Order } from '../models/Order';
import { Payment } from '../models/Payment';
import { WebhookEvent } from '../models/WebhookEvent';
import { ApiError } from '../utils/ApiError';
import { ApiResponse } from '../utils/ApiResponse';
import { asyncHandler } from '../utils/asyncHandler';

// Initialize Stripe instance supporting STRIPE_SECRET_KEY or STRIPE_TEST_KEY fallback
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || process.env.STRIPE_TEST_KEY || '', {
  apiVersion: '2023-10-16' as any,
});

/**
 * Creates a pending Order and Stripe PaymentIntent.
 * Recalculates prices dynamically on the server and checks provider Connect onboarding states.
 */
export const createPaymentIntent = asyncHandler(async (req: Request, res: Response) => {
  if (req.user.role !== 'CUSTOMER') {
    throw new ApiError(403, 'Only customers can proceed to checkout');
  }

  const { shippingAddress, idempotencyKey } = req.body;

  if (!shippingAddress) {
    throw new ApiError(400, 'Shipping address is required');
  }

  const { street, area, city, state, pincode } = shippingAddress;
  if (!street || !area || !city || !state || !pincode) {
    throw new ApiError(400, 'Invalid shipping address details');
  }

  // Generate or fallback to a custom idempotency key
  const finalIdempotencyKey = idempotencyKey || `chk-${req.user._id}-${Date.now()}`;

  // 1. Fetch populated customer cart
  const cart = await Cart.findOne({ user: req.user._id }).populate('items.product');
  if (!cart || cart.items.length === 0) {
    throw new ApiError(400, 'Your shopping cart is empty');
  }

  // 2. Validate provider details and enforce single merchant cart
  const firstItem = cart.items[0];
  const firstProduct = firstItem.product as any;
  if (!firstProduct || firstProduct.isDeleted) {
    throw new ApiError(400, 'Invalid or unavailable product in cart');
  }

  const provider = await User.findById(firstProduct.provider);
  if (!provider) {
    throw new ApiError(400, 'Merchant details not found');
  }

  if (!provider.stripeAccountId || !provider.isStripeReady) {
    throw new ApiError(
      400,
      `Merchant "${
        provider.businessName || provider.name
      }" cannot receive payments yet. Please remove their products from your cart to proceed.`
    );
  }

  const targetProviderId = provider._id.toString();
  let subtotalCents = 0;
  const orderItems = [];

  for (const item of cart.items) {
    const product = item.product as any;

    if (!product || product.isDeleted) {
      throw new ApiError(400, `Product "${product?.title || 'Unknown'}" is no longer available.`);
    }

    if (product.provider.toString() !== targetProviderId) {
      throw new ApiError(
        400,
        'All items in the cart must belong to the same merchant/provider for checkout.'
      );
    }

    if (item.quantity > product.stock) {
      throw new ApiError(
        400,
        `Insufficient stock for "${product.title}". Only ${product.stock} units available.`
      );
    }

    const itemPriceCents = product.price.amount;
    subtotalCents += item.quantity * itemPriceCents;

    orderItems.push({
      product: product._id,
      title: product.title,
      quantity: item.quantity,
      unitPrice: itemPriceCents,
      provider: product.provider,
    });
  }

  // Calculate pricing breakdown (Flat $5.00 shipping and 3% tax rate from customer)
  const shippingFeeCents = 500;
  const taxCents = Math.round(subtotalCents * 0.03);
  const totalAmountCents = subtotalCents + shippingFeeCents + taxCents;

  // Calculate marketplace application fee (10% of total payment amount)
  const applicationFeeCents = Math.round(totalAmountCents * 0.10);

  // 3. Prevent duplicate order creation by looking up the idempotency key
  let order = await Order.findOne({ idempotencyKey: finalIdempotencyKey });

  if (!order) {
    order = await Order.create({
      user: req.user._id,
      items: orderItems,
      totalAmount: totalAmountCents,
      status: 'PENDING',
      idempotencyKey: finalIdempotencyKey,
      shippingAddress: { street, area, city, state, pincode },
    });
  }

  // 4. Create Stripe PaymentIntent
  let paymentIntent;
  try {
    if (order.paymentIntentId) {
      // Re-use active payment intent if already created
      paymentIntent = await stripe.paymentIntents.retrieve(order.paymentIntentId);
    } else {
      paymentIntent = await stripe.paymentIntents.create(
        {
          amount: totalAmountCents,
          currency: 'usd',
          transfer_data: {
            destination: provider.stripeAccountId,
          },
          application_fee_amount: applicationFeeCents,
          metadata: {
            orderId: order._id.toString(),
            userId: req.user._id.toString(),
            idempotencyKey: finalIdempotencyKey,
          },
          payment_method_types: ['card'],
        },
        {
          idempotencyKey: finalIdempotencyKey, // Double capture prevention on Stripe server
        }
      );

      order.paymentIntentId = paymentIntent.id;
      await order.save();
    }
  } catch (stripeError: any) {
    throw new ApiError(500, `Stripe API error: ${stripeError.message}`);
  }

  // 5. Create or update the Payment record in PENDING status
  await Payment.findOneAndUpdate(
    { stripePaymentIntentId: paymentIntent.id },
    {
      order: order._id,
      user: req.user._id,
      stripePaymentIntentId: paymentIntent.id,
      amount: totalAmountCents,
      currency: 'usd',
      eventId: `pending-${paymentIntent.id}`,
      status: 'PENDING',
    },
    { upsert: true, new: true }
  );

  res.status(200).json(
    new ApiResponse(
      200,
      {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        orderId: order._id,
      },
      'Payment intent initialized successfully'
    )
  );
});

/**
 * Handles Stripe Webhook callback actions.
 * Atomically adjusts stock and clear carts on payment success.
 */
export const stripeWebhook = asyncHandler(async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string;
  const rawBody = req.body; // express.raw makes req.body the raw Buffer

  if (!sig || !rawBody) {
    throw new ApiError(400, 'Webhook signature and payload are required');
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET || '');
  } catch (err: any) {
    console.error('Stripe Webhook Signature Verification Failed:', err.message);
    throw new ApiError(400, `Webhook Error: ${err.message}`);
  }

  // 1. Idempotency check using WebhookEvent collection
  const alreadyProcessed = await WebhookEvent.findOne({ eventId: event.id });
  if (alreadyProcessed) {
    return res.status(200).json({ received: true, status: 'ALREADY_HANDLED' });
  }

  switch (event.type) {
    case 'payment_intent.succeeded': {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const { orderId, userId } = paymentIntent.metadata;

      if (!orderId) {
        console.warn('Webhook received payment_intent.succeeded but orderId metadata was missing');
        break;
      }

      const order = await Order.findById(orderId);
      if (!order) {
        console.error(`Order with ID ${orderId} not found during webhook processing`);
        return res.status(200).json({ received: true, status: 'ORDER_NOT_FOUND' });
      }

      // If order is already paid, exit early
      if (order.status === 'PAID') {
        break;
      }

      // 2. Atomic Stock Decrement & Deductions
      const rolledBackItems: Array<{ productId: any; quantity: number }> = [];
      let stockAllocationFailed = false;

      for (const item of order.items) {
        // Find active product and check stock >= quantity bounds atomically
        const updatedProduct = await Product.findOneAndUpdate(
          {
            _id: item.product,
            stock: { $gte: item.quantity },
            isDeleted: false,
          },
          { $inc: { stock: -item.quantity } },
          { new: true }
        );

        if (!updatedProduct) {
          stockAllocationFailed = true;
          break;
        } else {
          rolledBackItems.push({ productId: item.product, quantity: item.quantity });
        }
      }

      // 3. Handle Stock Deduction Failure (Overselling Fallback)
      if (stockAllocationFailed) {
        console.error(`[CRITICAL ALERT] Insufficient stock allocation for Order: ${order._id}. Initiating rollback and refund.`);

        // Rollback stock values
        for (const rollback of rolledBackItems) {
          await Product.findByIdAndUpdate(rollback.productId, { $inc: { stock: rollback.quantity } });
        }

        order.status = 'PAYMENT_HELD_STOCK_FAILED';
        await order.save();

        // Update Payment status to FAILED with failure reason
        await Payment.findOneAndUpdate(
          { stripePaymentIntentId: paymentIntent.id },
          {
            $set: {
              status: 'FAILED',
              failureReason: 'Stock allocation failed due to concurrent overselling.',
              eventId: event.id,
              stripeChargeId: paymentIntent.latest_charge as string,
            },
          },
          { upsert: true }
        );

        // Request automatic refund from Stripe
        try {
          await stripe.refunds.create({
            payment_intent: paymentIntent.id,
            reason: 'requested_by_customer',
            metadata: { orderId: order._id.toString(), reason: 'INSUFFICIENT_STOCK_ALLOCATION' },
          });

          order.status = 'CANCELLED';
          await order.save();
          console.log(`Successfully refunded PaymentIntent ${paymentIntent.id} due to stock allocation failure.`);
        } catch (refundError: any) {
          console.error(`Automatic refund failed for PaymentIntent ${paymentIntent.id}:`, refundError.message);
        }
      } else {
        // 4. Success Flow: Mark order paid, clear cart, update payment log
        order.status = 'PAID';
        await order.save();

        await Payment.findOneAndUpdate(
          { stripePaymentIntentId: paymentIntent.id },
          {
            $set: {
              status: 'COMPLETED',
              stripeChargeId: paymentIntent.latest_charge as string,
              eventId: event.id,
            },
          },
          { upsert: true }
        );

        // Clear customer cart contents
        await Cart.findOneAndUpdate({ user: order.user }, { $set: { items: [] } });

        console.log(`Order ${order._id} successfully marked as PAID. Cart cleared.`);
      }
      break;
    }

    case 'payment_intent.payment_failed': {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const { orderId } = paymentIntent.metadata;
      const failureReason = paymentIntent.last_payment_error?.message || 'Payment failed';

      if (orderId) {
        await Order.findByIdAndUpdate(orderId, { $set: { status: 'PAYMENT_FAILED' } });
        await Payment.findOneAndUpdate(
          { stripePaymentIntentId: paymentIntent.id },
          {
            $set: {
              status: 'FAILED',
              failureReason,
              stripeChargeId: paymentIntent.latest_charge as string,
              eventId: event.id,
            },
          },
          { upsert: true }
        );
        console.log(`Order ${orderId} marked as PAYMENT_FAILED. Reason: ${failureReason}`);
      }
      break;
    }

    case 'payment_intent.canceled': {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const { orderId } = paymentIntent.metadata;

      if (orderId) {
        await Order.findByIdAndUpdate(orderId, { $set: { status: 'CANCELLED' } });
        await Payment.findOneAndUpdate(
          { stripePaymentIntentId: paymentIntent.id },
          {
            $set: {
              status: 'FAILED',
              failureReason: 'Payment intent canceled.',
              stripeChargeId: paymentIntent.latest_charge as string,
              eventId: event.id,
            },
          },
          { upsert: true }
        );
        console.log(`Order ${orderId} marked as CANCELLED due to PaymentIntent cancellation`);
      }
      break;
    }

    case 'charge.refunded': {
      const charge = event.data.object as Stripe.Charge;
      const paymentIntentId = charge.payment_intent as string;

      if (paymentIntentId) {
        const order = await Order.findOne({ paymentIntentId });
        if (order) {
          if (order.status === 'REFUNDED') {
            break;
          }

          // Restock items atomically
          for (const item of order.items) {
            await Product.findByIdAndUpdate(item.product, { $inc: { stock: item.quantity } });
          }

          order.status = 'REFUNDED';
          await order.save();

          await Payment.findOneAndUpdate(
            { stripePaymentIntentId: paymentIntentId },
            {
              $set: {
                status: 'REFUNDED',
                stripeChargeId: charge.id,
                eventId: event.id,
                receiptUrl: charge.receipt_url || undefined,
              },
            },
            { upsert: true }
          );

          console.log(`Order ${order._id} successfully marked as REFUNDED. Items restocked.`);
        }
      }
      break;
    }

    case 'account.updated': {
      const account = event.data.object as Stripe.Account;
      const stripeAccountId = account.id;

      const isReady = !!(account.charges_enabled && account.payouts_enabled);
      const detailsSubmitted = account.details_submitted || false;

      const updatedUser = await User.findOneAndUpdate(
        { stripeAccountId },
        {
          $set: {
            isStripeReady: isReady,
            stripeDetailsSubmitted: detailsSubmitted,
          },
        },
        { new: true }
      );

      if (updatedUser) {
        console.log(
          `Webhook synchronized: Stripe Connect ${stripeAccountId} (User: ${updatedUser.name}) -> isStripeReady: ${isReady}, detailsSubmitted: ${detailsSubmitted}`
        );
      } else {
        console.warn(`Webhook received account.updated for Connect ID ${stripeAccountId} but no matching DB user was found.`);
      }
      break;
    }

    default:
      console.log(`Unhandled Stripe event type: ${event.type}`);
  }

  // Save event ID in WebhookEvent to ensure replay prevention
  await WebhookEvent.create({
    eventId: event.id,
    eventType: event.type,
  });

  res.status(200).json({ received: true });
});
