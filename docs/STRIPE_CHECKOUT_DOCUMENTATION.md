# Stripe Checkout & Payment Module Documentation

The Stripe Checkout & Payment Module handles checkout card captures using Stripe Elements, validates Connect onboarding status, ensures double-charge prevention, and handles webhooks for atomic inventory deductions.

## Stripe Elements PCI-DSS Compliance
We use Stripe Elements (`PaymentElement`) to capture card details on the frontend:
* Raw card details never touch our Express server.
* The frontend initiates payment verification directly via the Stripe JS SDK, which handles redirects and confirms intent status.

---

## Database Schemas & Updates

### 1. User Model Schema Updates (`backend/src/models/User.ts`)
Adds Stripe Connect onboarding properties:
```typescript
stripeAccountId?: string; // Unique sparse ID of the provider Connect account
isStripeReady?: boolean;  // Defaults to false. Verified when Connect onboarding is finished
```

### 2. Order Schema (`backend/src/models/Order.ts`)
Manages purchased item histories, totals, and statuses:
```typescript
export interface IOrderItem {
  product: Types.ObjectId;
  title: string;
  quantity: number;
  unitPrice: number;       // In cents
  provider: Types.ObjectId;
}

export interface IOrder extends Document {
  user: Types.ObjectId;
  items: IOrderItem[];
  totalAmount: number;     // Order total in cents
  status: 'PENDING' | 'PAID' | 'PROCESSING' | 'SHIPPED' | 'CANCELLED' | 'PAYMENT_FAILED' | 'PAYMENT_HELD_STOCK_FAILED';
  paymentIntentId?: string;
  idempotencyKey?: string; // Double charge protection
  shippingAddress: {
    street: string;
    area: string;
    city: string;
    state: string;
    pincode: string;
  };
}
```

### 3. Payment Schema (`backend/src/models/Payment.ts`)
Deduplicates webhook operations and tracks transactions:
```typescript
export interface IPayment extends Document {
  order: Types.ObjectId;
  user: Types.ObjectId;
  amount: number;                  // In cents
  stripePaymentIntentId: string;
  stripeEventId: string;           // Unique webhook event ID
  status: 'SUCCESS' | 'HELD_STOCK_FAILED';
}
```

---

## API Endpoints

### 1. Initialize Payment Intent
* **Route**: `POST /api/payments/create-intent`
* **Role Check**: `CUSTOMER`
* **Payload**:
```json
{
  "shippingAddress": {
    "street": "123 Main St",
    "area": "Suite A",
    "city": "San Jose",
    "state": "CA",
    "pincode": "95101"
  },
  "idempotencyKey": "unique-idempotency-uuid-or-key"
}
```
* **Process**:
  1. Computes totals dynamically on the server: `subtotal + $5.00 shipping + 3% tax`.
  2. For every item in the cart, inspects if the provider's `stripeAccountId` is present and `isStripeReady` is true. If not, rejects the checkout with a `400 Bad Request` block.
  3. Checks for an existing Order for this idempotency key. If none exists, creates a `PENDING` order.
  4. Requests a Stripe PaymentIntent, passing the idempotency key and metadata.
  5. Saves `paymentIntentId` and returns the `clientSecret`.

### 2. Stripe Webhook Receiver
* **Route**: `POST /api/payments/webhook`
* **Auth**: Unprotected (receives raw body buffer from Stripe).
* **Process**:
  1. Verifies raw body signature using `stripe.webhooks.constructEvent`.
  2. On `payment_intent.succeeded` event:
     * Inspects if the `eventId` is already recorded in the `Payment` collection. If yes, exits early.
     * Executes atomic MongoDB queries to decrement product stock:
       `Product.findOneAndUpdate({ _id: item.product, stock: { $gte: item.quantity } }, { $inc: { stock: -item.quantity } })`
     * If stock update fails (overselling fallback due to concurrent purchases), triggers an automatic Stripe refund:
       `stripe.refunds.create({ payment_intent: paymentIntentId })`
       Updates the Order status to `CANCELLED` (or `PAYMENT_HELD_STOCK_FAILED`).
     * If stock deductions succeed:
       * Updates Order status to `PAID`.
       * Logs transaction success in the `Payment` collection.
       * Clears the customer's `Cart`.
