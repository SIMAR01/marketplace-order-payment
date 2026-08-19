# Stripe Connect Connect Onboarding & Payouts Documentation

This module manages Provider Stripe Express Connected Account creation, payout onboarding links generation, Express Dashboard login links, and webhook-based Connect status synchronization. It gates listing creations until a provider has completed onboarding.

## Role Keywords & URL Exclusions
Following API clean paths, all routing paths use standard naming conventions and avoid role keywords (e.g. `provider`) in routing segments:
* `POST /api/stripe/onboarding-link`
* `GET /api/stripe/status`
* `POST /api/stripe/login-link`

---

## Database Schemas & Updates

### User Model Schema Updates (`backend/src/models/User.ts`)
Tracks Stripe Connect status parameters:
```typescript
stripeAccountId?: string;        // Connected Express Account ID
isStripeReady?: boolean;         // Checked before listing products. Defaults to false. Indexed.
stripeDetailsSubmitted?: boolean;// True if payout info submitted on Stripe
```

---

## API Endpoints

### 1. Generate Connect Onboarding Link
* **Route**: `POST /api/stripe/onboarding-link`
* **Role Check**: `PROVIDER`, `ADMIN`
* **Process**:
  1. Inspects if the user has an active `stripeAccountId`. If not, calls Stripe:
     `stripe.accounts.create({ type: 'express', email: user.email })`
     Saves the Connect account ID to the User profile.
  2. Generates an account link using `stripe.accountLinks.create` to route the provider to Stripe Connect onboarding, returning:
     `{ url: accountLink.url }`
  3. Uses onboarding callback redirects:
     * Success: `/inventory?stripe=success`
     * Refresh: `/inventory?stripe=refresh`

### 2. Retrieve & Synchronize Connect Status
* **Route**: `GET /api/stripe/status`
* **Role Check**: `PROVIDER`, `ADMIN`
* **Process**:
  1. Queries Stripe API directly using the provider's `stripeAccountId`.
  2. Computes Connect ready state: `charges_enabled && payouts_enabled`.
  3. Syncs ready states (`isStripeReady` and `stripeDetailsSubmitted`) directly into MongoDB.
  4. Returns the synchronized properties payload.

### 3. Generate Dashboard Single-Sign-On Login Link
* **Route**: `POST /api/stripe/login-link`
* **Role Check**: `PROVIDER`, `ADMIN`
* **Process**:
  1. Generates an Express Connect Dashboard single-sign-on login link:
     `stripe.accounts.createLoginLink(stripeAccountId)`
  2. Returns the dashboard link URL to let the merchant manage payouts and cards.

---

## Stripe Webhook Sync: `account.updated`
To ensure robust, zero-trust profile state syncs, the Stripe Webhook (`POST /api/payments/webhook`) listens for Connect `account.updated` events:
* When triggered, retrieves `account.id`.
* Checks capability flags (`charges_enabled && payouts_enabled`) and submission states.
* Executes atomic database updates:
```typescript
await User.findOneAndUpdate(
  { stripeAccountId: account.id },
  {
    $set: {
      isStripeReady: account.charges_enabled && account.payouts_enabled,
      stripeDetailsSubmitted: account.details_submitted
    }
  }
);
```

---

## Gatekeeping Guardrails

### 1. Backend: Product Creation (`backend/src/controllers/product.controller.ts`)
Before writing listings to database, the controller validates Connect status in real time:
```typescript
if (!req.user.isStripeReady) {
  const provider = await User.findById(req.user._id);
  if (!provider?.isStripeReady) {
    throw new ApiError(403, "You must configure your Stripe payout details before listing products for sale from My Products page.");
  }
}
```

### 2. Frontend: Product Inventory UI (`ProductListPage.tsx`)
* Renders the `<StripePayoutStatusCard />` banner component at the top of the inventory dashboard.
* If `isStripeReady` is false, disables the **Add New Product** CTA button, preventing product listing attempts until payout onboarding is completed.
