# Multi-Vendor Escrow Marketplace Application

A high-performance, secure, multi-vendor e-commerce marketplace built with Node.js/Express, React, TypeScript, and MongoDB. The platform orchestrates transaction trust by holding funds in a platform escrow balance via **Stripe Connect Express** and releasing payouts only upon confirmed package delivery (or a time-delayed cron fallback).

---

## 1. Project Overview & Tech Stack

The architecture is split into a dockerized backend stack and a local frontend development environment supporting Hot Module Replacement (HMR).

### Backend Tech Stack
* **Node.js & Express** with **TypeScript**
* **MongoDB & Mongoose** (for document persistence)
* **Docker & Docker Compose** (for automated orchestration)
* **Cloudinary** (for secure, multipart image uploads and storage)
* **Stripe Connect** (Express onboarding, PaymentIntents, Escrow Holds, Direct Transfers, and Webhooks)
* **Zod** (strict runtime request body validations)

### Latest Branch
staging

### Frontend Tech Stack
* **React** (built with Vite & TypeScript)
* **Tailwind CSS** (for rich UI layout and styling)
* **Redux Toolkit & RTK Query** (for unified client-state and api queries caching)
* **Lucide Icons** (for modern vector iconography)

---

## 2. Clone & Branch Setup

Clone the repository and switch to the active development branch:
```bash
# Clone the repository via SSH
git clone git@github.com:SIMAR01/marketplace-order-payment.git

# Navigate to the workspace root
cd marketplace-order-payment

# Switch to the staging branch
git checkout staging
```

---

## 3. Prerequisites

Ensure you have the following installed locally:
* **Node.js** (v18 or higher)
* **Docker Desktop**
* **Stripe CLI** or **Ngrok** (for local webhook testing)
* Active accounts on **Stripe** and **Cloudinary**

---

## 3. Environment Variables Configuration

Create `.env` configuration files inside their respective folders.

### 3.1 Backend Environment Configuration
File Path: [`backend/.env`](file:///e:/civilmantra_task/marketplace-order-payment/backend/.env) (Create or copy from `.env.example`):
```env
NODE_ENV=development
PORT=5000

# Database Connection (Docker Mongo service name is 'mongodb')
MONGODB_URI=mongodb://mongodb:27017/marketplace?retryWrites=false

# CORS Allowed Origin
CLIENT_URL=http://localhost:3000

# Auth Token Secrets & Expiries
JWT_ACCESS_SECRET=your_jwt_access_secret_hash_here
JWT_REFRESH_SECRET=your_jwt_refresh_secret_hash_here
JWT_ACCESS_EXPIRES_IN=3h
JWT_REFRESH_EXPIRES_IN=7d

# Cloudinary Media Storage Configuration
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# Stripe Keys
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_TEST_KEY=sk_test_...

# Stripe Local Webhook Signing Secret (from Stripe CLI/Dashboard)
STRIPE_WEBHOOK_SECRET=whsec_...
```

### 3.2 Frontend Environment Configuration
File Path: [`frontend/.env`](file:///e:/civilmantra_task/marketplace-order-payment/frontend/.env) (Create or copy from `.env.example`):
```env
VITE_API_BASE_URL=http://localhost:5000/api
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

---

## 4. Installation & Running the Application

### Step 4.1: Spin Up the Backend & Database (Docker)
Open your terminal in the project root directory and run:
```bash
docker compose up --build -d
```
This builds the backend service container, downloads MongoDB v7, and exposes:
* **Express Backend:** [http://localhost:5000](http://localhost:5000)
* **MongoDB Instance:** `localhost:27017`

### Step 4.2: Start the Frontend Dev Server (Local Host)
To enjoy lightning-fast Hot Module Replacement (HMR) and debugging, run the frontend directly on your host machine:
```bash
cd frontend
npm install
npm run dev
```
The frontend application will boot up at:
* **Frontend Web App:** [http://localhost:3000](http://localhost:3000) (as configured in CORS)

---

## 5. Stripe & Webhook Local Tunneling Setup

Since Stripe needs to send webhook events (like `payment_intent.succeeded` or `account.updated`) to your local server, you must expose port `5000` to the internet.

### Option A: Using the Stripe CLI (Recommended)
1. Login to your Stripe account:
   ```bash
   stripe login
   ```
2. Forward events to your local webhook endpoint:
   ```bash
   stripe listen --forward-to localhost:5000/api/payments/webhook
   ```
3. Copy the outputted webhook signing secret (`whsec_...`) and save it as `STRIPE_WEBHOOK_SECRET` in your `backend/.env`.
4. Restart your backend Docker container to apply the changes.

### Option B: Using Ngrok
1. Start an HTTP tunnel on port 5000:
   ```bash
   ngrok http 5000
   ```
2. Copy the secure forwarding URL (e.g., `https://abcd-123.ngrok-free.app`).
3. Register this URL with `/api/payments/webhook` appended in your Stripe Developer Dashboard under **Webhooks**.
4. Retrieve the webhook secret and save it in `backend/.env`.

> [!IMPORTANT]
> Make sure to enable **Express Connect Test Mode** in your Stripe Settings under Connect Settings to allow test onboarding.

---

## 6. Seed Data & E2E Testing Workflow (yet to implement)

To verify the escrow checkout flow locally, follow this end-to-end testing workflow:

1. **Create Accounts:**
   - Go to `/register` and sign up a **Customer** (e.g. `customer@test.com`).
   - Go to `/register` again and sign up a **Provider** (e.g. `merchant@test.com`). Make sure to supply business name and phone details.
2. **Setup Connect Onboarding:**
   - Log in as the **Provider**, head to the **My Products** page, and click **Connect Stripe Account**.
   - You will be redirected to the Stripe onboarding page. Fill out dummy test values. Once completed, Stripe redirects you back to your inventory dashboard.
   - The Connect status card should now display **Stripe Active & Ready**.
3. **List Products:**
   - As the Provider, create a few test listings by filling out details and uploading product images.
4. **Checkout Items:**
   - Log in as the **Customer**, browse the products catalog, and add items to your cart.
   - Open your cart and click **Checkout this Package** (checkout is executed per single-vendor package).
   - Enter your shipping address, input Stripe test card details (e.g. `4242 4242 4242 4242` with any future expiry date and random CVV), and click **Pay Securely Now**.
5. **Logistics & Escrow Payout Release:**
   - Once checkout completes, log in as the **Provider**, go to **My Sales/Orders**, and simulate fulfillment by transitioning the order: `PLACED` -> `PACKED` -> `SHIPPED` -> `DELIVERED`.
   - Once marked as `DELIVERED`, log in back as the **Customer**, go to **My Purchases**, and click **Confirm Delivery / Release Escrow**.
   - Funds are immediately released from platform escrow and transferred to the provider's Connected Account.
   - Alternatively, you can trigger the cron release endpoint (`POST /api/cron/release-payouts`) to auto-release payouts for orders delivered over 5 hours ago.

---

## 7. Troubleshooting

### Fix: Docker Compose `.env` File Mount Error
If `docker compose up` fails with an error similar to:
`MS_BIND|MS_REC: not a directory: Are you trying to mount a directory onto a file (or vice-versa)?`

This occurs when Docker Desktop caches local volume bindings or tries to resolve a file mount that is missing.
1. Make sure that [`backend/.env`](file:///e:/civilmantra_task/marketplace-order-payment/backend/.env) exists as a **file** (and is not mistakenly a folder) before launching the compose stack.
2. Clear the cached build containers and volumes:
   ```bash
   docker compose down -v
   docker compose up --build -d
   ```
