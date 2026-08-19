import { Request, Response } from 'express';
import Stripe from 'stripe';
import { User } from '../models/User';
import { ApiError } from '../utils/ApiError';
import { ApiResponse } from '../utils/ApiResponse';
import { asyncHandler } from '../utils/asyncHandler';

// Initialize Stripe instance supporting STRIPE_SECRET_KEY or STRIPE_TEST_KEY fallback
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || process.env.STRIPE_TEST_KEY || '', {
  apiVersion: '2023-10-16' as any,
});

/**
 * Creates a Stripe Connect Express account link for the authenticated Provider.
 */
export const createConnectAccountLink = asyncHandler(async (req: Request, res: Response) => {
  if (req.user.role !== 'PROVIDER' && req.user.role !== 'ADMIN') {
    throw new ApiError(403, 'Access denied: Stripe onboarding restricted to Providers');
  }

  const user = await User.findById(req.user._id);
  if (!user) {
    throw new ApiError(404, 'User profile not found');
  }

  // 1. Create a Connected Express account if none exists
  if (!user.stripeAccountId) {
    try {
      const account = await stripe.accounts.create({
        type: 'express',
        email: user.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        metadata: {
          userId: user._id.toString(),
          name: user.name,
        },
      });

      user.stripeAccountId = account.id;
      user.isStripeReady = false;
      user.stripeDetailsSubmitted = false;
      await user.save();
    } catch (stripeErr: any) {
      throw new ApiError(500, `Failed to create Stripe Connect account: ${stripeErr.message}`);
    }
  }

  // 2. Generate Account Link redirecting to Stripe onboarding
  try {
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
    const accountLink = await stripe.accountLinks.create({
      account: user.stripeAccountId,
      refresh_url: `${clientUrl}/inventory?stripe=refresh`,
      return_url: `${clientUrl}/inventory?stripe=success`,
      type: 'account_onboarding',
    });

    res
      .status(200)
      .json(new ApiResponse(200, { url: accountLink.url }, 'Stripe onboarding link generated successfully'));
  } catch (linkErr: any) {
    throw new ApiError(500, `Failed to create Stripe onboarding link: ${linkErr.message}`);
  }
});

/**
 * Retrieves the Connected account's status directly from Stripe API and syncs details in DB.
 */
export const getStripeAccountStatus = asyncHandler(async (req: Request, res: Response) => {
  if (req.user.role !== 'PROVIDER' && req.user.role !== 'ADMIN') {
    throw new ApiError(403, 'Access denied: Payout status queries restricted to Providers');
  }

  const user = await User.findById(req.user._id);
  if (!user) {
    throw new ApiError(404, 'User profile not found');
  }

  if (!user.stripeAccountId) {
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { isConnected: false, isStripeReady: false, detailsSubmitted: false },
          'No Connected Stripe account found'
        )
      );
  }

  // Query Stripe API directly to check status
  try {
    const account = await stripe.accounts.retrieve(user.stripeAccountId);
    const isReady = !!(account.charges_enabled && account.payouts_enabled);
    const detailsSubmitted = account.details_submitted || false;

    // Sync database flags
    user.isStripeReady = isReady;
    user.stripeDetailsSubmitted = detailsSubmitted;
    await user.save();

    res.status(200).json(
      new ApiResponse(
        200,
        { isConnected: true, isStripeReady: isReady, detailsSubmitted },
        'Stripe status retrieved and synchronized successfully'
      )
    );
  } catch (err: any) {
    throw new ApiError(500, `Stripe API error: ${err.message}`);
  }
});

/**
 * Generates an Express Connect Dashboard single-sign-on login link.
 */
export const createDashboardLoginLink = asyncHandler(async (req: Request, res: Response) => {
  if (req.user.role !== 'PROVIDER' && req.user.role !== 'ADMIN') {
    throw new ApiError(403, 'Access denied: Login link generation restricted to Providers');
  }

  const user = await User.findById(req.user._id);
  if (!user || !user.stripeAccountId) {
    throw new ApiError(400, 'Stripe Connected account has not been set up yet');
  }

  try {
    const loginLink = await stripe.accounts.createLoginLink(user.stripeAccountId);
    res
      .status(200)
      .json(new ApiResponse(200, { url: loginLink.url }, 'Stripe Dashboard login link generated successfully'));
  } catch (err: any) {
    throw new ApiError(500, `Failed to generate Stripe Connect login link: ${err.message}`);
  }
});
