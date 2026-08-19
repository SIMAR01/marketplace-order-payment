import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useGetCartQuery } from '../api/cartApi';
import { useCreatePaymentIntentMutation, IShippingAddress } from '../api/paymentApi';
import { CATEGORY_LABELS, ProductCategory } from '../constants/categories';
import {
  CreditCard,
  MapPin,
  Lock,
  ArrowLeft,
  AlertTriangle,
  Package,
} from 'lucide-react';
import Button from '../components/common/Button';
import Spinner from '../components/common/Spinner';

// Initialize Stripe Promise
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_51U61Nu4TuQyO6iVKIg8GoEvaTO3i6x0L5c1BqyjrbPqSoelY77kl5D04Drg2h2vJXei1FVYDK18x2krkjXCLkb1r006pEikmJg');

// --- UNIFIED CHECKOUT FORM (ADDRESS + CARD IN ONE STEP) ---
interface UnifiedFormProps {
  totalAmountCents: number;
}

const UnifiedCheckoutForm: React.FC<UnifiedFormProps> = () => {
  const stripe = useStripe();
  const elements = useElements();
  const [createPaymentIntent, { isLoading: isProcessing }] = useCreatePaymentIntentMutation();

  const [shippingAddress, setShippingAddress] = useState<IShippingAddress>({
    street: '',
    area: '',
    city: '',
    state: '',
    pincode: '',
  });

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setErrorMessage(null);

    // 1. Validate shipping address fields
    if (
      !shippingAddress.street.trim() ||
      !shippingAddress.area.trim() ||
      !shippingAddress.city.trim() ||
      !shippingAddress.state.trim() ||
      !shippingAddress.pincode.trim()
    ) {
      setErrorMessage('Please fill in all shipping address fields.');
      return;
    }

    // 2. Validate payment element values
    const { error: submitError } = await elements.submit();
    if (submitError) {
      setErrorMessage(submitError.message || 'Payment details validation failed.');
      return;
    }

    try {
      // 3. Request PaymentIntent initialization from the backend
      const response = await createPaymentIntent({ shippingAddress }).unwrap();
      const { clientSecret, orderId } = response;

      // 4. Confirm Stripe payment using elements and the clientSecret
      const { error } = await stripe.confirmPayment({
        elements,
        clientSecret,
        confirmParams: {
          return_url: `${window.location.origin}/checkout/success?orderId=${orderId}`,
        },
      });

      if (error) {
        setErrorMessage(error.message || 'An unexpected payment error occurred.');
      }
    } catch (err: any) {
      setErrorMessage(
        err?.data?.message || err?.message || 'Checkout process failed. Please try again.'
      );
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Shipping Address Details */}
      <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-xl space-y-4 backdrop-blur-sm">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-800/80 pb-3 mb-4">
          <MapPin size={16} className="text-indigo-400" /> Shipping Address
        </h3>
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-xs text-slate-450 font-bold uppercase mb-1.5">Street Address*</label>
            <input
              type="text"
              required
              disabled={isProcessing}
              value={shippingAddress.street}
              onChange={(e) => setShippingAddress((prev) => ({ ...prev, street: e.target.value }))}
              placeholder="e.g. 123 Main St"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500 disabled:opacity-50"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-450 font-bold uppercase mb-1.5">Area / Landmark*</label>
            <input
              type="text"
              required
              disabled={isProcessing}
              value={shippingAddress.area}
              onChange={(e) => setShippingAddress((prev) => ({ ...prev, area: e.target.value }))}
              placeholder="e.g. Apartment, Suite, Floor"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-855 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500 disabled:opacity-50"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-slate-455 font-bold uppercase mb-1.5">City*</label>
              <input
                type="text"
                required
                disabled={isProcessing}
                value={shippingAddress.city}
                onChange={(e) => setShippingAddress((prev) => ({ ...prev, city: e.target.value }))}
                placeholder="e.g. San Jose"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500 disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-455 font-bold uppercase mb-1.5">State*</label>
              <input
                type="text"
                required
                disabled={isProcessing}
                value={shippingAddress.state}
                onChange={(e) => setShippingAddress((prev) => ({ ...prev, state: e.target.value }))}
                placeholder="e.g. CA"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500 disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-455 font-bold uppercase mb-1.5">Pincode / ZIP*</label>
              <input
                type="text"
                required
                disabled={isProcessing}
                value={shippingAddress.pincode}
                onChange={(e) => setShippingAddress((prev) => ({ ...prev, pincode: e.target.value }))}
                placeholder="e.g. 95101"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500 disabled:opacity-50"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Card Element Details */}
      <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-xl space-y-4 backdrop-blur-sm">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-800/80 pb-3 mb-4">
          <CreditCard size={16} className="text-indigo-400" /> Card Details
        </h3>
        <PaymentElement />
      </div>

      {errorMessage && (
        <div className="bg-red-500/5 border border-red-500/20 text-red-400 p-4 rounded-lg text-xs flex gap-2">
          <AlertTriangle size={16} className="shrink-0 text-red-500" />
          <span>{errorMessage}</span>
        </div>
      )}

      <Button
        type="submit"
        disabled={!stripe || isProcessing}
        className="w-full shadow-lg shadow-indigo-500/20 py-3 text-base font-extrabold"
        leftIcon={isProcessing ? <Spinner size="sm" /> : <Lock size={16} />}
      >
        {isProcessing ? 'Processing Payment...' : 'Pay Securely Now'}
      </Button>
    </form>
  );
};

// --- MAIN CHECKOUT PAGE COMPONENT ---
const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();

  // 1. Fetch populated customer cart
  const { data: cart, isLoading: isLoadingCart, error: cartError } = useGetCartQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });

  const items = cart?.items || [];
  const totals = cart?.totals;
  const hasWarnings = cart?.hasWarnings || false;

  // Redirection guard if cart is empty or has issues
  useEffect(() => {
    if (cart && (items.length === 0 || hasWarnings)) {
      navigate('/cart');
    }
  }, [cart, items, hasWarnings, navigate]);

  if (isLoadingCart) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center">
        <Spinner size="lg" className="text-indigo-500 mb-4" />
        <p className="text-sm text-slate-400">Reviewing cart details...</p>
      </div>
    );
  }

  if (cartError || !cart) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <div className="w-14 h-14 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto mb-6 border border-red-500/20">
          <AlertTriangle size={24} />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Checkout Error</h2>
        <p className="text-slate-400 mb-6 text-sm">
          Failed to load checkout parameters. Head back to your cart to verify items.
        </p>
        <Link to="/cart">
          <Button variant="outline" leftIcon={<ArrowLeft size={16} />}>
            Back to Cart
          </Button>
        </Link>
      </div>
    );
  }

  // Calculate dynamic checkout totals for deferred element creation
  const subtotal = totals?.subtotal || 0;
  const shippingFee = totals?.shippingFee || 0;
  const tax = subtotal * 0.03;
  const totalAmountCents = Math.round((subtotal + shippingFee + tax) * 100);

  const elementsOptions = {
    mode: 'payment' as const,
    amount: totalAmountCents,
    currency: 'usd',
    payment_method_types: ['card'],
    appearance: {
      theme: 'night' as const,
      variables: { colorPrimary: '#6366f1', colorBackground: '#0b0f19' },
    },
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-6 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
            Checkout
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Complete shipping and payment details in a single step securely powered by Stripe.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Checkout Forms */}
        <div className="lg:col-span-7">
          {totalAmountCents > 0 && (
            <Elements stripe={stripePromise} options={elementsOptions}>
              <UnifiedCheckoutForm totalAmountCents={totalAmountCents} />
            </Elements>
          )}
        </div>

        {/* Right Column: Checkout Review Summary */}
        <div className="lg:col-span-5">
          <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-6 space-y-6 backdrop-blur-md sticky top-24">
            <h2 className="text-lg font-bold text-white border-b border-slate-800 pb-3">Review Items</h2>

            {/* Cart products breakdown list */}
            <div className="max-h-60 overflow-y-auto space-y-4 pr-1 scrollbar-thin">
              {items.map((item) => {
                const product = item.product;
                const primaryImage = product.images?.[0]?.url || null;
                const categoryLabel = CATEGORY_LABELS[product.category as ProductCategory] || product.category;

                return (
                  <div key={product._id} className="flex gap-3 justify-between items-center bg-slate-950/40 p-3 rounded-lg border border-slate-850">
                    <div className="flex gap-3 items-center">
                      <div className="w-12 h-12 bg-slate-900 border border-slate-850 rounded overflow-hidden shrink-0 flex items-center justify-center">
                        {primaryImage ? (
                          <img src={primaryImage} alt={product.title} className="w-full h-full object-cover" />
                        ) : (
                          <Package size={16} className="text-slate-600" />
                        )}
                      </div>
                      <div className="text-left">
                        <span className="text-[9px] bg-slate-900 text-indigo-400 px-1.5 py-0.5 rounded border border-indigo-500/10 uppercase tracking-wider font-semibold">
                          {categoryLabel}
                        </span>
                        <h4 className="text-xs font-bold text-white mt-1 line-clamp-1 max-w-[150px] sm:max-w-[200px]">
                          {product.title}
                        </h4>
                        <span className="text-[10px] text-slate-500">Qty: {item.quantity}</span>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-indigo-400 font-mono shrink-0">
                      ${(item.product.price.amount * item.quantity).toFixed(2)}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Calculations Breakdown (Estimated Tax: 3%) */}
            {totals && (
              <div className="space-y-3 text-xs border-t border-slate-800/80 pt-4">
                <div className="flex items-center justify-between text-slate-400">
                  <span>Subtotal</span>
                  <span className="font-mono text-slate-200">${totals.subtotal.toFixed(2)} USD</span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>Shipping Fee</span>
                  <span className="font-mono text-slate-200">${totals.shippingFee.toFixed(2)} USD</span>
                </div>
                <div className="flex items-center justify-between text-slate-400 border-b border-slate-850 pb-3">
                  {/* Estimating 3% tax to match checkout calculations */}
                  <span>Estimated Tax (3%)</span>
                  <span className="font-mono text-slate-200">
                    ${(totals.subtotal * 0.03).toFixed(2)} USD
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm font-extrabold text-white pt-1">
                  <span>Order Total</span>
                  <span className="font-mono text-indigo-400">
                    ${(totals.subtotal + totals.shippingFee + totals.subtotal * 0.03).toFixed(2)} USD
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
