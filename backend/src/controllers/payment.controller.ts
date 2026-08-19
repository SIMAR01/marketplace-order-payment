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

// Initialize Stripe instance prioritizing STRIPE_TEST_KEY
const stripe = new Stripe(process.env.STRIPE_TEST_KEY || process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16' as any,
});

/**
 * Creates a pending Order and Stripe PaymentIntent for a specific vendor's items.
 * The customer checks out one vendor package at a time.
 */
export const createPaymentIntent = asyncHandler(async (req: Request, res: Response) => {
  if (req.user.role !== 'CUSTOMER') {
    throw new ApiError(403, 'Only customers can proceed to checkout');
  }

  const { shippingAddress, providerId, idempotencyKey } = req.body;

  if (!shippingAddress) {
    throw new ApiError(400, 'Shipping address is required');
  }

  const { street, area, city, state, pincode } = shippingAddress;
  if (!street || !area || !city || !state || !pincode) {
    throw new ApiError(400, 'Invalid shipping address details');
  }

  if (!providerId || !Types.ObjectId.isValid(providerId)) {
    throw new ApiError(400, 'A valid provider ID is required for single-vendor checkout');
  }

  const finalIdempotencyKey = idempotencyKey || `chk-${req.user._id}-${providerId}-${Date.now()}`;

  // 1. Fetch populated customer cart
  const cart = await Cart.findOne({ user: req.user._id }).populate({
    path: 'items.product',
    populate: { path: 'provider' },
  });

  if (!cart || cart.items.length === 0) {
    throw new ApiError(400, 'Your shopping cart is empty');
  }

  // Filter items to include ONLY products belonging to the requested provider
  const providerItems = cart.items.filter((item: any) => {
    const product = item.product;
    return product && product.provider && product.provider._id.toString() === providerId;
  });

  if (providerItems.length === 0) {
    throw new ApiError(400, 'No items from the selected merchant found in your cart');
  }

  let subtotalCents = 0;
  const orderItems = [];

  // Validate items, provider ready state, and stock limits
  for (const item of providerItems) {
    const product = item.product as any;

    if (!product || product.isDeleted) {
      throw new ApiError(400, `Product "${product?.title || 'Unknown'}" is no longer available.`);
    }

    if (item.quantity > product.stock) {
      throw new ApiError(
        400,
        `Insufficient stock for "${product.title}". Only ${product.stock} units available.`
      );
    }

    const provider = product.provider;
    if (!provider || !provider.stripeAccountId || !provider.isStripeReady) {
      throw new ApiError(
        400,
        `Merchant is not ready to receive payouts. Please contact support.`
      );
    }

    const priceCents = product.price.amount;
    subtotalCents += item.quantity * priceCents;

    orderItems.push({
      product: product._id,
      title: product.title,
      quantity: item.quantity,
      unitPrice: priceCents,
      imageUrl: product.images?.[0]?.url || undefined,
    });
  }

  // Calculate pricing breakdown in DOLLARS (Zero-Trust Server calculations)
  const grossAmount = subtotalCents / 100;
  const platformFee = Math.round(grossAmount * 0.10 * 100) / 100; // 10% Platform fee

  // Calculate Stripe fee (2.9% + $0.30)
  const stripeFee = Math.round((grossAmount * 0.029 + 0.30) * 100) / 100;
  const netPayout = Math.round((grossAmount - platformFee - stripeFee) * 100) / 100;

  // Shipping flat fee and tax rates applied to customer charge
  const shippingFee = 5.0; // $5.00 shipping
  const tax = Math.round(grossAmount * 0.03 * 100) / 100; // 3% tax
  const totalAmount = Math.round((grossAmount + shippingFee + tax) * 100) / 100;
  const totalAmountCents = Math.round(totalAmount * 100);

  // 2. Prevent database bloat and index conflicts by cleaning up any previous PENDING checkout attempts for this vendor package
  await Order.deleteMany({
    customer: req.user._id,
    provider: providerId,
    paymentStatus: 'PENDING',
  });

  // Create a brand new unique Order number
  const orderNumber = `ORD-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

  const order = await Order.create({
    orderNumber,
    customer: req.user._id,
    provider: new Types.ObjectId(providerId),
    items: orderItems,
    financials: {
      grossAmount,
      platformFee,
      stripeFee,
      netPayout,
      currency: 'usd',
    },
    shippingAddress: { street, area, city, state, pincode },
    status: 'PLACED',
    paymentStatus: 'PENDING',
    payoutStatus: 'HELD_IN_ESCROW',
    paymentIntentId: `pending-${orderNumber}`, // Set unique pending ID to avoid index collisions
  });

  // 3. Create Stripe PaymentIntent on the platform account (escrow separate charge)
  let paymentIntent;
  try {
    paymentIntent = await stripe.paymentIntents.create(
      {
        amount: totalAmountCents,
        currency: 'usd',
        capture_method: 'automatic', // Ensures money settles into platform Stripe balance
        metadata: {
          orderId: order._id.toString(),
          userId: req.user._id.toString(),
          providerId: providerId,
          idempotencyKey: finalIdempotencyKey,
        },
        payment_method_types: ['card'],
      },
      {
        idempotencyKey: finalIdempotencyKey,
      }
    );

    order.paymentIntentId = paymentIntent.id;
    await order.save();
  } catch (stripeError: any) {
    // Cleanup created order if Stripe setup fails
    await Order.findByIdAndDelete(order._id);
    throw new ApiError(500, `Stripe API error: ${stripeError.message}`);
  }

  // 4. Create or update the Payment record in PENDING status
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
        orderNumber: order.orderNumber,
      },
      'Payment intent initialized successfully for vendor package'
    )
  );
});

/**
 * Stripe webhook callback handler.
 * Deducts stock atomically, transitions order statuses, and clears purchased items from cart.
 */
export const stripeWebhook = asyncHandler(async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string;
  const rawBody = req.body;

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

  // Idempotency check
  const alreadyProcessed = await WebhookEvent.findOne({ eventId: event.id });
  if (alreadyProcessed) {
    return res.status(200).json({ received: true, status: 'ALREADY_HANDLED' });
  }

  switch (event.type) {
    case 'payment_intent.succeeded': {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const { orderId } = paymentIntent.metadata;

      if (!orderId) {
        console.warn('Webhook received payment_intent.succeeded but orderId metadata was missing');
        break;
      }

      const order = await Order.findById(orderId);
      if (!order) {
        console.error(`Order with ID ${orderId} not found during webhook processing`);
        return res.status(200).json({ received: true, status: 'ORDER_NOT_FOUND' });
      }

      if (order.paymentStatus === 'PAID') {
        break;
      }

      // 1. Atomic Stock Decrement & Deductions
      const rolledBackItems: Array<{ productId: any; quantity: number }> = [];
      let stockAllocationFailed = false;

      for (const item of order.items) {
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

      // 2. Fallback refund if stock allocation fails (overselling mitigation)
      if (stockAllocationFailed) {
        console.error(`[CRITICAL ALERT] Insufficient stock allocation for Order: ${order._id}. Rollback and refund.`);

        // Rollback stock values
        for (const rollback of rolledBackItems) {
          await Product.findByIdAndUpdate(rollback.productId, { $inc: { stock: rollback.quantity } });
        }

        order.status = 'CANCELLED';
        order.paymentStatus = 'FAILED';
        order.payoutStatus = 'CANCELLED';
        order.cancelReason = 'Overselling race condition fallback.';
        await order.save();

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

        try {
          await stripe.refunds.create({
            payment_intent: paymentIntent.id,
            reason: 'requested_by_customer',
          });
          console.log(`Successfully refunded PaymentIntent ${paymentIntent.id} due to stock allocation failure.`);
        } catch (refundError: any) {
          console.error(`Automatic refund failed for PaymentIntent ${paymentIntent.id}:`, refundError.message);
        }
      } else {
        // 3. Success Flow: Mark paid, escrow holds, and pull purchased items from cart
        order.status = 'PLACED';
        order.paymentStatus = 'PAID';
        order.payoutStatus = 'HELD_IN_ESCROW';
        order.stripeChargeId = paymentIntent.latest_charge as string;
        await order.save();

        // Update Payment logs
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

        // Remove only the purchased items from the customer's cart
        const productIds = order.items.map((i) => new Types.ObjectId(i.product.toString()));
        const updatedCart = await Cart.findOneAndUpdate(
          { user: order.customer },
          { $pull: { items: { product: { $in: productIds } } } },
          { new: true }
        );

        console.log(`Order ${order.orderNumber} successfully completed. Cleared purchased products from cart: ${productIds}. Cart items remaining: ${updatedCart?.items?.length || 0}`);
      }
      break;
    }

    case 'payment_intent.payment_failed': {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const { orderId } = paymentIntent.metadata;
      const failureReason = paymentIntent.last_payment_error?.message || 'Payment failed';

      if (orderId) {
        await Order.findByIdAndUpdate(orderId, {
          $set: { paymentStatus: 'FAILED', status: 'CANCELLED', cancelReason: failureReason },
        });
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
        console.log(`Order ${orderId} marked as payment FAILED.`);
      }
      break;
    }

    case 'payment_intent.canceled': {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const { orderId } = paymentIntent.metadata;

      if (orderId) {
        await Order.findByIdAndUpdate(orderId, {
          $set: { paymentStatus: 'FAILED', status: 'CANCELLED', cancelReason: 'Payment canceled' },
        });
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
        console.log(`Order ${orderId} canceled.`);
      }
      break;
    }

    case 'charge.refunded': {
      const charge = event.data.object as Stripe.Charge;
      const paymentIntentId = charge.payment_intent as string;

      if (paymentIntentId) {
        const order = await Order.findOne({ paymentIntentId });
        if (order && order.paymentStatus !== 'REFUNDED') {
          // Restock items atomically
          for (const item of order.items) {
            await Product.findByIdAndUpdate(item.product, { $inc: { stock: item.quantity } });
          }

          order.paymentStatus = 'REFUNDED';
          order.status = 'CANCELLED';
          order.payoutStatus = 'CANCELLED';
          order.cancelReason = 'Order refund approved.';
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

          console.log(`Order ${order.orderNumber} successfully marked as REFUNDED.`);
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
          `Webhook synchronized: Stripe Connect ${stripeAccountId} (User: ${updatedUser.name}) -> isStripeReady: ${isReady}`
        );
      }
      break;
    }

    default:
      console.log(`Unhandled Stripe event type: ${event.type}`);
  }

  // Save event ID in WebhookEvent
  await WebhookEvent.create({
    eventId: event.id,
    eventType: event.type,
  });

  res.status(200).json({ received: true });
});

/**
 * Retrieves orders for the authenticated user based on their role.
 * CUSTOMERS get their placed orders, PROVIDERS get orders assigned to them, ADMINS get all.
 */
export const getOrders = asyncHandler(async (req: Request, res: Response) => {
  const role = req.user.role;
  const userId = req.user._id;

  if (role === 'CUSTOMER') {
    const orders = await Order.find({ customer: userId })
      .populate('provider', 'name businessName stripeAccountId')
      .populate('items.product')
      .sort({ createdAt: -1 });

    return res.status(200).json(new ApiResponse(200, orders, 'Customer orders retrieved successfully'));
  } else if (role === 'PROVIDER') {
    const orders = await Order.find({ provider: userId })
      .populate('customer', 'name email')
      .populate('items.product')
      .sort({ createdAt: -1 });

    return res.status(200).json(new ApiResponse(200, orders, 'Provider orders retrieved successfully'));
  } else if (role === 'ADMIN') {
    const orders = await Order.find()
      .populate('customer', 'name email')
      .populate('provider', 'name businessName stripeAccountId')
      .populate('items.product')
      .sort({ createdAt: -1 });

    return res.status(200).json(new ApiResponse(200, orders, 'All platform orders retrieved successfully'));
  }

  throw new ApiError(403, 'Access denied');
});

/**
 * Customer requests cancellation on a placed, packed, or shipped order.
 */
export const requestOrderCancellation = asyncHandler(async (req: Request, res: Response) => {
  const { orderId } = req.params;
  const { reason = 'Customer request' } = req.body;

  const order = await Order.findById(orderId);
  if (!order) {
    throw new ApiError(404, 'Order not found');
  }

  if (order.customer.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'Access denied: You do not own this order');
  }

  const cancellableStatuses = ['PLACED', 'PACKED', 'SHIPPED'];
  if (!cancellableStatuses.includes(order.status)) {
    throw new ApiError(400, `Cannot request cancellation for order in status: ${order.status}`);
  }

  order.status = 'CANCEL_REQUESTED';
  order.cancelReason = reason;
  await order.save();

  res.status(200).json(new ApiResponse(200, order, 'Cancellation requested successfully'));
});

/**
 * Provider updates shipping/delivery log transit states (PACKED, SHIPPED, DELIVERED).
 */
export const updateOrderStatus = asyncHandler(async (req: Request, res: Response) => {
  const { orderId } = req.params;
  const { status } = req.body;

  const order = await Order.findById(orderId);
  if (!order) {
    throw new ApiError(404, 'Order not found');
  }

  if (order.provider.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'Access denied: You are not the merchant for this order');
  }

  const allowedStatuses = ['PACKED', 'SHIPPED', 'DELIVERED'];
  if (!allowedStatuses.includes(status)) {
    throw new ApiError(400, 'Invalid status transition');
  }

  order.status = status as any;

  if (status === 'SHIPPED') {
    order.shippedAt = new Date();
  } else if (status === 'DELIVERED') {
    order.deliveredAt = new Date();
  }

  await order.save();

  res.status(200).json(new ApiResponse(200, order, `Order status transit successfully updated to ${status}`));
});

/**
 * Customer confirms receipt of delivery and releases escrow funds to Connect.
 */
export const releaseOrderPayout = asyncHandler(async (req: Request, res: Response) => {
  const { orderId } = req.params;

  const order = await Order.findById(orderId);
  if (!order) {
    throw new ApiError(404, 'Order not found');
  }

  if (order.customer.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'Access denied: You do not own this order');
  }

  if (order.status !== 'DELIVERED') {
    throw new ApiError(400, 'Payout can only be released after the order has been delivered.');
  }

  if (order.payoutStatus !== 'HELD_IN_ESCROW') {
    throw new ApiError(400, `Payout cannot be released: Current status is ${order.payoutStatus}`);
  }

  const providerUser = await User.findById(order.provider);
  if (!providerUser || !providerUser.stripeAccountId) {
    throw new ApiError(400, 'Merchant Stripe account configuration missing');
  }

  // Retrieve stored stripeChargeId directly from Order, fallback to retrieving from Stripe if missing
  let chargeId = order.stripeChargeId;
  if (!chargeId) {
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(order.paymentIntentId);
      chargeId = paymentIntent.latest_charge as string;
      order.stripeChargeId = chargeId;
      await order.save();
    } catch (err: any) {
      console.warn(`Failed to retrieve PaymentIntent fallback ${order.paymentIntentId} for transfer source:`, err.message);
    }
  }

  // Release Connect transfer
  try {
    const transfer = await stripe.transfers.create({
      amount: Math.round(order.financials.netPayout * 100), // convert dollars back to cents for Stripe Transfer
      currency: 'usd',
      destination: providerUser.stripeAccountId,
      source_transaction: chargeId, // link to platform charge to bypass platform balance limits
      description: `Release payout for Order: ${order.orderNumber}`,
    });

    order.status = 'COMPLETED';
    order.payoutStatus = 'TRANSFERRED';
    order.stripeTransferId = transfer.id;
    order.completedAt = new Date();
    await order.save();
  } catch (stripeErr: any) {
    throw new ApiError(500, `Stripe Transfer failed: ${stripeErr.message}`);
  }

  res.status(200).json(new ApiResponse(200, order, 'Payout released successfully to merchant.'));
});

/**
 * Admin approves a cancellation request and refunds the order amount.
 */
export const approveOrderRefund = asyncHandler(async (req: Request, res: Response) => {
  if (req.user.role !== 'ADMIN') {
    throw new ApiError(403, 'Access denied: Admin role required');
  }

  const { orderId } = req.params;

  const order = await Order.findById(orderId);
  if (!order) {
    throw new ApiError(404, 'Order not found');
  }

  if (order.status !== 'CANCEL_REQUESTED') {
    throw new ApiError(400, `Order cancellation has not been requested (current status: ${order.status})`);
  }

  // Retrieve customer charge amount from logs (includes shipping & taxes)
  const paymentLog = await Payment.findOne({ order: order._id });
  const refundAmountCents = paymentLog ? paymentLog.amount : Math.round((order.financials.grossAmount + 5.0 + order.financials.grossAmount * 0.03) * 100);

  // 1. Issue Stripe Refund
  try {
    await stripe.refunds.create({
      payment_intent: order.paymentIntentId,
      amount: refundAmountCents,
    });
  } catch (stripeErr: any) {
    throw new ApiError(500, `Stripe Refund failed: ${stripeErr.message}`);
  }

  // 2. Restock products atomically
  for (const item of order.items) {
    await Product.findByIdAndUpdate(item.product, { $inc: { stock: item.quantity } });
  }

  // 3. Update Order states
  order.status = 'CANCELLED';
  order.paymentStatus = 'REFUNDED';
  order.payoutStatus = 'CANCELLED';
  await order.save();

  res.status(200).json(new ApiResponse(200, order, 'Refund approved and stock returned successfully'));
});

/**
 * Cron release job.
 * Releases escrow payouts 5 hours after delivery status fallback.
 */
export const triggerPayoutCron = asyncHandler(async (req: Request, res: Response) => {
  // 5 hours ago threshold
  const thresholdTime = new Date(Date.now() - 5 * 60 * 60 * 1000);

  const eligibleOrders = await Order.find({
    status: 'DELIVERED',
    payoutStatus: 'HELD_IN_ESCROW',
    deliveredAt: { $lte: thresholdTime },
  });

  let processedCount = 0;
  const failures: any[] = [];

  for (const order of eligibleOrders) {
    const providerUser = await User.findById(order.provider);
    if (!providerUser || !providerUser.stripeAccountId) {
      failures.push({ orderId: order._id, reason: 'Stripe Connected Account missing' });
      continue;
    }

    try {
      // Retrieve stored stripeChargeId directly from Order, fallback to retrieving from Stripe if missing
      let chargeId = order.stripeChargeId;
      if (!chargeId) {
        try {
          const paymentIntent = await stripe.paymentIntents.retrieve(order.paymentIntentId);
          chargeId = paymentIntent.latest_charge as string;
          order.stripeChargeId = chargeId;
          await order.save();
        } catch (err: any) {
          console.warn(`Cron failed to retrieve PaymentIntent fallback ${order.paymentIntentId}:`, err.message);
        }
      }

      const transfer = await stripe.transfers.create({
        amount: Math.round(order.financials.netPayout * 100),
        currency: 'usd',
        destination: providerUser.stripeAccountId,
        source_transaction: chargeId, // link to platform charge to bypass platform balance limits
        description: `Automated Cron Escrow Payout release for Order: ${order.orderNumber}`,
      });

      order.status = 'COMPLETED';
      order.payoutStatus = 'TRANSFERRED';
      order.stripeTransferId = transfer.id;
      order.completedAt = new Date();
      await order.save();

      processedCount++;
    } catch (err: any) {
      failures.push({ orderId: order._id, error: err.message });
    }
  }

  res.status(200).json(
    new ApiResponse(
      200,
      { processed: processedCount, eligibleTotal: eligibleOrders.length, failures },
      'Payout release cron job processed successfully'
    )
  );
});

/**
 * Fallback verification check.
 * Verifies with Stripe if the checkout payment has succeeded, updating inventory and clearing cart items directly.
 */
export const verifyCheckoutSuccess = asyncHandler(async (req: Request, res: Response) => {
  const { orderId } = req.params;

  const order = await Order.findById(orderId);
  if (!order) {
    throw new ApiError(404, 'Order not found');
  }

  if (order.customer.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'Access denied');
  }

  if (order.paymentStatus === 'PENDING') {
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(order.paymentIntentId);

      if (paymentIntent.status === 'succeeded') {
        // Run atomic stock check & decrement
        const rolledBackItems: Array<{ productId: any; quantity: number }> = [];
        let stockAllocationFailed = false;

        for (const item of order.items) {
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

        if (stockAllocationFailed) {
          // Rollback and refund
          for (const rollback of rolledBackItems) {
            await Product.findByIdAndUpdate(rollback.productId, { $inc: { stock: rollback.quantity } });
          }
          order.status = 'CANCELLED';
          order.paymentStatus = 'FAILED';
          order.payoutStatus = 'CANCELLED';
          order.cancelReason = 'Overselling race condition fallback.';
          await order.save();

          await stripe.refunds.create({
            payment_intent: paymentIntent.id,
            reason: 'requested_by_customer',
          });
        } else {
          order.status = 'PLACED';
          order.paymentStatus = 'PAID';
          order.payoutStatus = 'HELD_IN_ESCROW';
          order.stripeChargeId = paymentIntent.latest_charge as string;
          await order.save();

          // Remove only the purchased items from the customer's cart
          const productIds = order.items.map((i) => new Types.ObjectId(i.product.toString()));
          await Cart.findOneAndUpdate(
            { user: order.customer },
            { $pull: { items: { product: { $in: productIds } } } }
          );
        }
      }
    } catch (stripeErr: any) {
      console.warn(`Fallback verification Stripe check failed for Order ${orderId}:`, stripeErr.message);
    }
  }

  res.status(200).json(new ApiResponse(200, order, 'Order checkout success verified successfully'));
});
