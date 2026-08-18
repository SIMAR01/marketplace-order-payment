import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  useGetCartQuery,
  useUpdateCartItemMutation,
  useRemoveFromCartMutation,
  useClearCartMutation,
  ICartItem,
} from '../api/cartApi';
import { CATEGORY_LABELS, ProductCategory } from '../constants/categories';
import {
  Trash2,
  Minus,
  Plus,
  ShoppingBag,
  ArrowLeft,
  AlertTriangle,
  CreditCard,
  RefreshCw,
  Info,
  Package,
} from 'lucide-react';
import Button from '../components/common/Button';
import Spinner from '../components/common/Spinner';
import { generateProductSlug } from '../utils/slug';

const CartPage: React.FC = () => {
  const navigate = useNavigate();

  // 1. RTK Query: fetch populated cart details
  const { data: cart, isLoading, error, refetch } = useGetCartQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });

  const [updateCartItem, { isLoading: isUpdating }] = useUpdateCartItemMutation();
  const [removeFromCart, { isLoading: isRemoving }] = useRemoveFromCartMutation();
  const [clearCart, { isLoading: isClearing }] = useClearCartMutation();

  const items = cart?.items || [];
  const totals = cart?.totals;
  const hasWarnings = cart?.hasWarnings || false;

  // Quantity modifiers
  const handleQuantityChange = async (item: ICartItem, newQty: number) => {
    if (newQty < 1) {
      await removeFromCart(item.product._id).unwrap();
    } else {
      await updateCartItem({ productId: item.product._id, quantity: newQty }).unwrap();
    }
  };

  const handleRemoveItem = async (productId: string) => {
    if (window.confirm('Are you sure you want to remove this item from your cart?')) {
      await removeFromCart(productId).unwrap();
    }
  };

  const handleClearCart = async () => {
    if (window.confirm('Are you sure you want to empty your shopping cart?')) {
      await clearCart().unwrap();
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center">
        <Spinner size="lg" className="text-indigo-500 mb-4" />
        <p className="text-sm text-slate-400">Loading your shopping cart...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <div className="w-14 h-14 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto mb-6 border border-red-500/20">
          <AlertTriangle size={24} />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Failed to Load Cart</h2>
        <p className="text-slate-400 mb-6 text-sm">
          An unexpected error occurred while communicating with the cart API. Please check your network connection.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link to="/products">
            <Button variant="outline" leftIcon={<ArrowLeft size={16} />}>
              Return to Shop
            </Button>
          </Link>
          <Button onClick={() => refetch()} leftIcon={<RefreshCw size={14} />}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="max-w-xl mx-auto px-4 py-24 text-center">
        <div className="w-16 h-16 rounded-full bg-slate-900/60 text-slate-500 flex items-center justify-center mx-auto mb-6 border border-slate-800">
          <ShoppingBag size={28} className="stroke-[1.5]" />
        </div>
        <h2 className="text-2xl font-extrabold text-white mb-3">Your Shopping Cart is Empty</h2>
        <p className="text-slate-400 mb-8 text-sm">
          Looks like you haven't added any products to your cart yet. Head back to the store to explore our catalog.
        </p>
        <Link to="/products">
          <Button size="lg" className="shadow-lg shadow-indigo-500/20">
            Start Shopping
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 min-h-screen bg-slate-950 text-slate-100">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-800 pb-6 mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
            Your Cart
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Review your items, update stock quantities, and verify pricing before checkout.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={handleClearCart}
          disabled={isClearing || isUpdating || isRemoving}
          className="text-red-400 hover:text-red-300 border-slate-800 hover:bg-red-500/5 text-xs py-2 px-3"
          leftIcon={<Trash2 size={14} />}
        >
          Clear Cart
        </Button>
      </div>

      {/* Grid Layout: Items list vs. Summary Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Items List */}
        <div className="lg:col-span-8 space-y-4">
          {items.map((item) => {
            const product = item.product;
            const primaryImage = product.images?.[0]?.url || null;
            const categoryLabel = CATEGORY_LABELS[product.category as ProductCategory] || product.category;

            return (
              <div
                key={product._id}
                className={`relative flex flex-col sm:flex-row items-start sm:items-center justify-between bg-slate-900/40 border rounded-xl p-5 gap-6 backdrop-blur-sm transition-colors ${item.isOutOfStock || item.hasInsufficientStock ? 'border-red-500/30 bg-red-950/5' : 'border-slate-850'
                  }`}
              >
                {/* Product details thumbnail & titles */}
                <div className="flex items-start gap-4 flex-grow">
                  <div className="w-20 h-20 bg-slate-950/60 border border-slate-800 rounded-lg overflow-hidden shrink-0 flex items-center justify-center">
                    {primaryImage ? (
                      <img src={primaryImage} alt={product.title} className="w-full h-full object-cover" />
                    ) : (
                      <Package size={24} className="text-slate-650" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">
                      {categoryLabel}
                    </span>
                    <h3 className="text-sm font-bold text-white leading-snug line-clamp-1">
                      <Link to={`/p/${generateProductSlug(product.title)}/${product._id}`} className="hover:text-indigo-400 transition-colors">
                        {product.title}
                      </Link>
                    </h3>

                    {/* Stock violations warnings */}
                    {item.isOutOfStock ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-400 mt-1 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">
                        <AlertTriangle size={10} /> Out of stock
                      </span>
                    ) : item.hasInsufficientStock ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-500 mt-1 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                        <AlertTriangle size={10} /> Insufficient stock: only {product.stock} available
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-500">Stock: {product.stock} available</span>
                    )}
                  </div>
                </div>

                {/* Pricing, Quantity Selector, and Remove button */}
                <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto border-t sm:border-0 border-slate-800/80 pt-4 sm:pt-0 shrink-0">
                  {/* Price */}
                  <div className="flex flex-col text-left sm:text-right">
                    <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Unit Price</span>
                    <span className="text-sm font-semibold text-slate-300 font-mono">
                      {product.price.amount.toFixed(2)} {product.price.currency}
                    </span>
                  </div>

                  {/* Quantity selector */}
                  <div className="flex items-center space-x-1 border border-slate-850 rounded-lg bg-slate-950 p-0.5">
                    <button
                      onClick={() => handleQuantityChange(item, item.quantity - 1)}
                      disabled={isUpdating}
                      className="px-2 py-1 text-slate-400 hover:text-white rounded transition-colors"
                      aria-label="Decrease quantity"
                    >
                      <Minus size={10} />
                    </button>
                    <span className="w-8 text-center text-xs font-bold text-white font-mono">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => handleQuantityChange(item, item.quantity + 1)}
                      disabled={isUpdating || item.quantity >= product.stock}
                      className="px-2 py-1 text-slate-400 hover:text-white rounded transition-colors disabled:opacity-30"
                      aria-label="Increase quantity"
                    >
                      <Plus size={10} />
                    </button>
                  </div>

                  {/* Subtotal */}
                  <div className="flex flex-col text-right">
                    <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Subtotal</span>
                    <span className="text-sm font-bold text-indigo-400 font-mono">
                      {item.subtotal.toFixed(2)} {product.price.currency}
                    </span>
                  </div>

                  {/* Trash remover */}
                  <button
                    onClick={() => handleRemoveItem(product._id)}
                    disabled={isRemoving}
                    className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors"
                    title="Remove item"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Column: Order Summary Panel */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-6 space-y-6 backdrop-blur-md">
            <h2 className="text-lg font-bold text-white border-b border-slate-800/80 pb-3">Order Summary</h2>

            {/* Warning Panel */}
            {hasWarnings && (
              <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-4 flex gap-3 text-red-400">
                <AlertTriangle size={16} className="shrink-0 mt-0.5 text-red-500 animate-bounce" />
                <div className="text-xs space-y-1">
                  <p className="font-bold text-white">Stock Conflict Warnings Detected</p>
                  <p className="leading-normal">
                    Some items in your cart are out of stock or have insufficient quantities. Adjust quantities or remove them to checkout.
                  </p>
                </div>
              </div>
            )}

            {/* Calculations Breakdown */}
            {totals && (
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between text-slate-400">
                  <span>Subtotal</span>
                  <span className="font-mono text-slate-200">${totals.subtotal.toFixed(2)} USD</span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>Estimated Shipping</span>
                  <span className="font-mono text-slate-200">${totals.shippingFee.toFixed(2)} USD</span>
                </div>
                <div className="flex items-center justify-between text-slate-400 border-b border-slate-850 pb-3">
                  <span>Estimated Tax (8%)</span>
                  <span className="font-mono text-slate-200">${totals.tax.toFixed(2)} USD</span>
                </div>
                <div className="flex items-center justify-between text-base font-extrabold text-white pt-1">
                  <span>Order Total</span>
                  <span className="font-mono text-indigo-400">${totals.totalAmount.toFixed(2)} USD</span>
                </div>
              </div>
            )}

            {/* Guarantee Badge */}
            {/* For now i am considering static shipping charges, otherwise it should be handled dynamically using shippo or else */}
            <div className="flex gap-2.5 items-start p-3 bg-slate-950/60 border border-slate-850 rounded-lg text-xs text-slate-400">
              <Info size={14} className="text-indigo-400 shrink-0 mt-0.5" />
              <p className="leading-normal">
                Standard flat $5.00 shipping fee applied to all non-empty orders. Real-time pricing computed securely on the server later on.
              </p>
            </div>

            {/* Checkout CTA */}
            <div className="space-y-3">
              <Button
                onClick={() => alert('Proceeding to Checkout page...')}
                disabled={hasWarnings || items.length === 0}
                className="w-full shadow-lg shadow-indigo-500/10"
                leftIcon={<CreditCard size={16} />}
              >
                Proceed to Checkout
              </Button>
              <Link to="/products" className="block">
                <Button variant="outline" className="w-full text-xs text-slate-400 border-slate-850">
                  Continue Shopping
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartPage;
