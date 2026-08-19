# REST API Reference - Multi-Vendor Escrow Marketplace

* **Base URL**: `http://localhost:5000/api`
* **JSON format**: All request bodies must be JSON, and responses return JSON format.
* **Response Status Codes**: All API responses explicitly return a `statusCode` field in the JSON body.

---

## 1. Authentication & User Management

### 1.1 User Registration
Registers a new customer, provider/seller, or administrator.
* **Route**: `POST /api/auth/register`
* **Headers**: None
* **Authentication**: None
* **Zod Schema:**
  - `role` must be `'CUSTOMER' | 'PROVIDER' | 'ADMIN'`. Defaults to `'CUSTOMER'`.
  - For `CUSTOMER` / `ADMIN`: `name` (min 2), `email` (valid email), `password` (min 6).
  - For `PROVIDER`: `name` (min 2), `email` (valid email), `password` (min 6), `phone` (min 10, mandatory), `businessName` (min 3, optional).
* **Request Body (CUSTOMER)**:
  ```json
  {
    "name": "John Customer",
    "email": "customer@example.com",
    "password": "securepassword123",
    "role": "CUSTOMER"
  }
  ```
* **Request Body (PROVIDER)**:
  ```json
  {
    "name": "Jane Vendor",
    "email": "vendor@example.com",
    "password": "securepassword123",
    "role": "PROVIDER",
    "phone": "9876543210",
    "businessName": "Jane's Tech Store"
  }
  ```
* **Success Response (201 Created)**:
  - **Headers**: `Set-Cookie: refreshToken=<token>; HttpOnly; Secure; SameSite=strict; Path=/`
  - **Body**:
    ```json
    {
      "success": true,
      "statusCode": 201,
      "message": "User registered successfully",
      "data": {
        "user": {
          "_id": "64724a2efca31e67dbd39201",
          "name": "John Customer",
          "email": "customer@example.com",
          "role": "CUSTOMER",
          "createdAt": "2026-08-18T15:45:00.000Z"
        },
        "accessToken": "eyJhbGciOiJIUzI1NiIsIn..."
      }
    }
    ```

---

### 1.2 User Login
Authenticates user credentials and opens a new session.
* **Route**: `POST /api/auth/login`
* **Authentication**: None
* **Request Body**:
  ```json
  {
    "email": "customer@example.com",
    "password": "securepassword123"
  }
  ```
* **Success Response (200 OK)**:
  - **Headers**: `Set-Cookie: refreshToken=<token>; HttpOnly; Secure; SameSite=strict; Path=/`
  - **Body**:
    ```json
    {
      "success": true,
      "statusCode": 200,
      "message": "Logged in successfully",
      "data": {
        "user": {
          "_id": "64724a2efca31e67dbd39201",
          "name": "John Customer",
          "email": "customer@example.com",
          "role": "CUSTOMER",
          "createdAt": "2026-08-18T15:45:00.000Z"
        },
        "accessToken": "eyJhbGciOiJIUzI1NiIsIn..."
      }
    }
    ```

---

### 1.3 Rotate Token (Refresh Access)
Exchanges an active HttpOnly refresh cookie for a rotated refresh token and a new short-lived access token.
* **Route**: `POST /api/auth/refresh`
* **Authentication**: None (Reads `refreshToken` from cookies)
* **Success Response (200 OK)**:
  - **Headers**: `Set-Cookie: refreshToken=<new-token>; HttpOnly; Secure; SameSite=strict; Path=/`
  - **Body**:
    ```json
    {
      "success": true,
      "statusCode": 200,
      "message": "Access token refreshed successfully",
      "data": {
        "accessToken": "eyJhbGciOiJIUzI1NiIsIn..."
      }
    }
    ```

---

### 1.4 Get User Profile
Retrieves data of the currently logged-in user.
* **Route**: `GET /api/auth/profile`
* **Headers**: `Authorization: Bearer <accessToken>`
* **Authentication**: Required (Valid Access Token)
* **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "User profile retrieved successfully",
    "data": {
      "user": {
        "_id": "64724a2efca31e67dbd39201",
        "name": "John Customer",
        "email": "customer@example.com",
        "role": "CUSTOMER",
        "createdAt": "2026-08-18T15:45:00.000Z",
        "updatedAt": "2026-08-18T15:45:00.000Z"
      }
    }
  }
  ```

---

### 1.5 User Logout
Terminates the current session and clears cookies.
* **Route**: `POST /api/auth/logout`
* **Headers**: `Authorization: Bearer <accessToken>`
* **Authentication**: Required
* **Success Response (200 OK)**:
  - **Headers**: Clears `refreshToken` cookie.
  - **Body**:
    ```json
    {
      "success": true,
      "statusCode": 200,
      "message": "Logged out successfully",
      "data": {}
    }
    ```

---

## 2. Provider Stripe Connect

All endpoints in this section are restricted strictly to users with the role `PROVIDER` or `ADMIN`.

### 2.1 Generate Connect Onboarding Link
Creates a Stripe Express Connect account (if none exists) and generates a verification/onboarding setup link.
* **Route**: `POST /api/stripe/onboarding-link`
* **Headers**: `Authorization: Bearer <accessToken>`
* **Authentication**: Required (`PROVIDER` | `ADMIN`)
* **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "Stripe onboarding link generated successfully",
    "data": {
      "url": "https://connect.stripe.com/express/oauth/authorize/..."
    }
  }
  ```

---

### 2.2 Retrieve Stripe Connect Status
Queries Stripe APIs directly to check charges and payouts flags, syncing `isStripeReady` and `stripeDetailsSubmitted` in the database.
* **Route**: `GET /api/stripe/status`
* **Headers**: `Authorization: Bearer <accessToken>`
* **Authentication**: Required (`PROVIDER` | `ADMIN`)
* **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "Stripe status retrieved and synchronized successfully",
    "data": {
      "isConnected": true,
      "isStripeReady": true,
      "detailsSubmitted": true
    }
  }
  ```

---

### 2.3 Generate Express Dashboard Login Link
Generates a secure single-sign-on login link to redirect providers directly to their Express Connect dashboard.
* **Route**: `POST /api/stripe/login-link`
* **Headers**: `Authorization: Bearer <accessToken>`
* **Authentication**: Required (`PROVIDER` | `ADMIN`)
* **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "Stripe Dashboard login link generated successfully",
    "data": {
      "url": "https://connect.stripe.com/login/..."
    }
  }
  ```

---

## 3. Products Management & Discovery

### 3.1 Global Search Products (Public Catalog)
Queries active, non-deleted listings with filters, sorting, and pagination.
* **Route**: `GET /api/products`
* **Authentication**: None
* **Query Parameters**:
  - `page`: Number (default: 1)
  - `limit`: Number (default: 8)
  - `search`: String (searches title and description)
  - `category`: String (exact enum match)
  - `inStock`: Boolean ("true" to filter stock > 0)
  - `minPrice`: Number (decimal range)
  - `maxPrice`: Number (decimal range)
* **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "Products retrieved successfully",
    "data": {
      "products": [
        {
          "_id": "64724a2efca31e67dbd39301",
          "title": "Professional Wireless Keyboard",
          "description": "Ergonomic keyboard with mechanical switches.",
          "price": {
            "amount": 89.99,
            "currency": "USD"
          },
          "stock": 150,
          "category": "ELECTRONICS",
          "images": [
            {
              "url": "https://res.cloudinary.com/...",
              "publicId": "products/kbd1"
            }
          ],
          "provider": "64724a2efca31e67dbd39202",
          "isDeleted": false,
          "createdAt": "2026-08-18T16:00:00.000Z"
        }
      ],
      "total": 1,
      "page": 1,
      "totalPages": 1
    }
  }
  ```

---

### 3.2 Get Product By ID (Public PDP Details)
Retrieves single product details.
* **Route**: `GET /api/products/:id`
* **Authentication**: None
* **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "Product details retrieved successfully",
    "data": {
      "_id": "64724a2efca31e67dbd39301",
      "title": "Professional Wireless Keyboard",
      "description": "Ergonomic keyboard with mechanical switches.",
      "price": {
        "amount": 89.99,
        "currency": "USD"
      },
      "stock": 150,
      "category": "ELECTRONICS",
      "images": [
        {
          "url": "https://res.cloudinary.com/...",
          "publicId": "products/kbd1"
        }
      ],
      "provider": {
        "_id": "64724a2efca31e67dbd39202",
        "name": "Jane Vendor",
        "businessName": "Jane's Tech Store"
      },
      "isDeleted": false
    }
  }
  ```

---

### 3.3 Create Product (Protected)
Adds a new product to active inventory. The provider MUST have configured Stripe Connect successfully (`isStripeReady === true`).
* **Route**: `POST /api/products`
* **Headers**: `Authorization: Bearer <accessToken>`, `Content-Type: multipart/form-data`
* **Authentication**: Required (`PROVIDER` | `ADMIN`)
* **Request Fields (Form Data)**:
  - `title`: String (3-120 chars)
  - `description`: String (10-2000 chars)
  - `price`: JSON string (e.g. `{"amount": 89.99, "currency": "USD"}`)
  - `stock`: Number (integer >= 0)
  - `category`: String (Must match categories list)
  - `images`: Binary files (up to 5 image uploads)
* **Success Response (201 Created)**:
  ```json
  {
    "success": true,
    "statusCode": 201,
    "message": "Product created successfully",
    "data": {
      "_id": "64724a2efca31e67dbd39301",
      "title": "Professional Wireless Keyboard",
      "description": "Ergonomic keyboard with mechanical switches.",
      "price": {
        "amount": 89.99,
        "currency": "USD"
      },
      "stock": 150,
      "category": "ELECTRONICS",
      "images": [
        {
          "url": "https://res.cloudinary.com/...",
          "publicId": "products/kbd1"
        }
      ],
      "provider": "64724a2efca31e67dbd39202"
    }
  }
  ```

---

### 3.4 List Provider Products (Inventory Dashboard)
Retrieves listings belonging strictly to the authenticated Provider.
* **Route**: `GET /api/products/inventory`
* **Headers**: `Authorization: Bearer <accessToken>`
* **Authentication**: Required (`PROVIDER` | `ADMIN`)
* **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "Products retrieved successfully",
    "data": {
      "products": [ ... ],
      "total": 12,
      "page": 1,
      "totalPages": 2
    }
  }
  ```

---

### 3.5 Update Product
Updates description details or replaces image attachments.
* **Route**: `PATCH /api/products/:id`
* **Headers**: `Authorization: Bearer <accessToken>`, `Content-Type: multipart/form-data`
* **Authentication**: Required (`PROVIDER` | `ADMIN`)
* **Request Fields (Form Data, All Optional)**:
  - `title`, `description`, `price` (JSON string), `stock`, `category`
  - `replaceImages`: Boolean string (`"true"` to remove current Cloudinary images and use new ones)
  - `images`: Binary file uploads
* **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "Product updated successfully",
    "data": { ... }
  }
  ```

---

### 3.6 Delete Product
Marks a product as soft-deleted.
* **Route**: `DELETE /api/products/:id`
* **Headers**: `Authorization: Bearer <accessToken>`
* **Authentication**: Required (`PROVIDER` | `ADMIN`)
* **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "Product removed successfully",
    "data": {}
  }
  ```

---

## 4. Cart Management

All endpoints in this section require a valid access token and are restricted to users with the role `CUSTOMER`.

### 4.1 Retrieve Populated Cart
Returns the customer's active items grouped by vendor packages, calculating dynamic shipping fees, taxes, and stock warning states.
* **Route**: `GET /api/cart`
* **Headers**: `Authorization: Bearer <accessToken>`
* **Authentication**: Required (`CUSTOMER`)
* **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "Cart retrieved successfully",
    "data": {
      "_id": "65f2a1b0c034a78b9d000100",
      "user": "65f2a0b0c034a78b9d000001",
      "vendorPackages": [
        {
          "provider": {
            "_id": "64724a2efca31e67dbd39202",
            "name": "Jane Vendor",
            "businessName": "Jane's Tech Store",
            "stripeAccountId": "acct_1Ou...",
            "isStripeReady": true
          },
          "items": [
            {
              "product": {
                "_id": "64724a2efca31e67dbd39301",
                "title": "Professional Wireless Keyboard",
                "description": "Ergonomic keyboard with mechanical switches.",
                "price": {
                  "amount": 89.99,
                  "currency": "USD"
                },
                "stock": 150,
                "category": "ELECTRONICS",
                "images": [ ... ]
              },
              "quantity": 1,
              "subtotal": 89.99,
              "isOutOfStock": false,
              "hasInsufficientStock": false
            }
          ],
          "totals": {
            "subtotal": 89.99,
            "shippingFee": 5.0,
            "tax": 2.7,
            "totalAmount": 97.69
          },
          "hasWarnings": false
        }
      ],
      "totalCartItemsCount": 1,
      "hasWarnings": false
    }
  }
  ```

---

### 4.2 Add Product to Cart
Adds a product to the cart or increments its quantity.
* **Route**: `POST /api/cart`
* **Headers**: `Authorization: Bearer <accessToken>`
* **Authentication**: Required (`CUSTOMER`)
* **Request Body**:
  ```json
  {
    "productId": "64724a2efca31e67dbd39301",
    "quantity": 1
  }
  ```
* **Success Response (200 OK)**: Returns the updated, fully populated cart structure (as in 4.1).

---

### 4.3 Update Cart Item Quantity
Explicitly updates item quantity in the cart. Passing a quantity of `0` removes the item.
* **Route**: `PATCH /api/cart/item`
* **Headers**: `Authorization: Bearer <accessToken>`
* **Authentication**: Required (`CUSTOMER`)
* **Request Body**:
  ```json
  {
    "productId": "64724a2efca31e67dbd39301",
    "quantity": 3
  }
  ```
* **Success Response (200 OK)**: Returns the updated, fully populated cart structure.

---

### 4.4 Remove Product from Cart
Removes a specific product from the cart completely.
* **Route**: `DELETE /api/cart/item/:productId`
* **Headers**: `Authorization: Bearer <accessToken>`
* **Authentication**: Required (`CUSTOMER`)
* **Success Response (200 OK)**: Returns the updated, fully populated cart structure.

---

### 4.5 Clear Cart
Empties the customer's cart.
* **Route**: `DELETE /api/cart`
* **Headers**: `Authorization: Bearer <accessToken>`
* **Authentication**: Required (`CUSTOMER`)
* **Success Response (200 OK)**: Returns the updated, empty cart structure.

---

## 5. Orders & Checkout

### 5.1 Initialize Payment Intent
Creates a pending order and initializes a Stripe PaymentIntent for checking out a single merchant's package.
* **Route**: `POST /api/orders/checkout-intent`
* **Headers**: `Authorization: Bearer <accessToken>`
* **Authentication**: Required (`CUSTOMER`)
* **Request Body**:
  ```json
  {
    "shippingAddress": {
      "street": "123 Main St",
      "area": "Suite A",
      "city": "San Jose",
      "state": "CA",
      "pincode": "95101"
    },
    "providerId": "64724a2efca31e67dbd39202"
  }
  ```
* **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "Payment intent initialized successfully for vendor package",
    "data": {
      "clientSecret": "pi_3Ou..._secret_...",
      "paymentIntentId": "pi_3Ou...",
      "orderId": "65f2c001c034a78b9d000500",
      "orderNumber": "ORD-1724068800000-8472"
    }
  }
  ```

---

### 5.2 Get User Orders History
Fetches order listings. Filters results automatically by active role claims.
* **Route**: `GET /api/orders`
* **Headers**: `Authorization: Bearer <accessToken>`
* **Authentication**: Required (`CUSTOMER` | `PROVIDER` | `ADMIN`)
* **Success Response (200 OK - CUSTOMER)**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "Customer orders retrieved successfully",
    "data": [
      {
        "_id": "65f2c001c034a78b9d000500",
        "orderNumber": "ORD-1724068800000-8472",
        "customer": "65f2a0b0c034a78b9d000001",
        "provider": {
          "_id": "64724a2efca31e67dbd39202",
          "name": "Jane Vendor",
          "businessName": "Jane's Tech Store",
          "stripeAccountId": "acct_1Ou..."
        },
        "items": [
          {
            "product": "64724a2efca31e67dbd39301",
            "title": "Professional Wireless Keyboard",
            "quantity": 1,
            "unitPrice": 8999
          }
        ],
        "financials": {
          "grossAmount": 89.99,
          "platformFee": 9.0,
          "stripeFee": 2.91,
          "netPayout": 78.08,
          "currency": "usd"
        },
        "shippingAddress": { ... },
        "status": "PLACED",
        "paymentStatus": "PAID",
        "payoutStatus": "HELD_IN_ESCROW",
        "paymentIntentId": "pi_3Ou...",
        "stripeChargeId": "ch_3Ou...",
        "createdAt": "2026-08-19T07:40:00.000Z"
      }
    ]
  }
  ```

---

### 5.3 Verify Checkout Success (Direct Pull Success Fallback)
Forces direct verification with Stripe API if webhook transit is delayed, restocking and updating cart items.
* **Route**: `GET /api/orders/success/:orderId`
* **Headers**: `Authorization: Bearer <accessToken>`
* **Authentication**: Required (`CUSTOMER`)
* **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "Checkout verification successfully checked",
    "data": {
      "orderId": "65f2c001c034a78b9d000500",
      "paymentStatus": "PAID",
      "status": "PLACED"
    }
  }
  ```

---

### 5.4 Update Order Shipping Transit Status
Simulates delivery pipeline transit steps.
* **Route**: `POST /api/orders/:orderId/status`
* **Headers**: `Authorization: Bearer <accessToken>`
* **Authentication**: Required (`PROVIDER` | `ADMIN`)
* **Request Body**:
  ```json
  {
    "status": "SHIPPED"
  }
  ```
  *(Allowed values: `"PACKED"`, `"SHIPPED"`, `"DELIVERED"`)*
* **Success Response (200 OK)**: Returns the updated order payload.

---

### 5.5 Confirm Receipt & Release Escrow
Customer confirms delivery and transfers held platform balance to Connected Account.
* **Route**: `POST /api/orders/:orderId/release`
* **Headers**: `Authorization: Bearer <accessToken>`
* **Authentication**: Required (`CUSTOMER`)
* **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "Payout released successfully to merchant.",
    "data": {
      "_id": "65f2c001c034a78b9d000500",
      "status": "COMPLETED",
      "payoutStatus": "TRANSFERRED",
      "stripeTransferId": "tr_1Ou..."
    }
  }
  ```

---

### 5.6 Request Order Cancellation
Customers request cancellation and order refund before packages are completed.
* **Route**: `POST /api/orders/:orderId/cancel-request`
* **Headers**: `Authorization: Bearer <accessToken>`
* **Authentication**: Required (`CUSTOMER`)
* **Request Body**:
  ```json
  {
    "reason": "Accidental double checkout"
  }
  ```
* **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "Cancellation requested successfully",
    "data": {
      "_id": "65f2c001c034a78b9d000500",
      "status": "CANCEL_REQUESTED",
      "cancelReason": "Accidental double checkout"
    }
  }
  ```

---

## 6. Admin Operations

### 6.1 Approve Cancellation Refund
Processes the cancel request, releases authorization holds via `stripe.refunds.create`, and restocks items atomically into active catalog counts.
* **Route**: `POST /api/orders/:orderId/approve-refund`
* **Headers**: `Authorization: Bearer <accessToken>`
* **Authentication**: Required (`ADMIN`)
* **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "Refund approved and stock returned successfully",
    "data": {
      "_id": "65f2c001c034a78b9d000500",
      "status": "CANCELLED",
      "paymentStatus": "REFUNDED",
      "payoutStatus": "CANCELLED"
    }
  }
  ```

---

## 7. Webhooks & Cron System

### 7.1 Stripe Webhook Event Listener
Handles Stripe callbacks. Expects the raw payload buffer.
* **Route**: `POST /api/payments/webhook`
* **Authentication**: Signature verification (`Stripe-Signature` header required)
* **Events Listened**:
  - `payment_intent.succeeded`: Allocates stock. If successful: marks Order `PAID`, clears cart, sets escrow. If fails: triggers auto-refund and cancels Order.
  - `payment_intent.payment_failed`: Marks order as `FAILED` / `CANCELLED`.
  - `charge.refunded`: Atomic restock of product counts and marks Order `REFUNDED` / `CANCELLED`.
  - `account.updated`: Syncs Connected Account capabilities status.
* **Success Response (200 OK)**:
  ```json
  {
    "received": true
  }
  ```

---

### 7.2 Release Escrow Payouts Cron
Automated payout executor simulating cron schedules. Automatically transfers funds to merchants for delivered orders older than 5 hours.
* **Route**: `POST /api/cron/release-payouts`
* **Authentication**: None
* **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "Payout release cron job processed successfully",
    "data": {
      "processed": 3,
      "eligibleTotal": 3,
      "failures": []
    }
  }
  ```
