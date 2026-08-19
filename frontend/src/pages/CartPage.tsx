import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  useGetCartQuery,
  useUpdateCartItemMutation,
  useRemoveFromCartMutation,
  useClearCartMutation,
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

  // 1. RTK Query: fetch populated cart details grouped by vendor packages
  const { data: cart, isLoading, error, refetch } = useGetCartQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });

  const [updateCartItem, { isLoading: isUpdating }] = useUpdateCartItemMutation();
  const [removeFromCart, { isLoading: isRemoving }] = useRemoveFromCartMutation();
  const [clearCart, { isLoading: isClearing }] = useClearCartMutation();

  const vendorPackages = cart?.vendorPackages || [];
  const totalCartItemsCount = cart?.totalCartItemsCount || 0;
  const hasWarnings = cart?.hasWarnings || false;

  // Quantity modifiers
  const handleQuantityChange = async (productId: string, currentQty: number, newQty: number) => {
    if (newQty < 1) {
      await removeFromCart(productId).unwrap();
    } else {
      await updateCartItem({ productId, quantity: newQty }).unwrap();
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
      <div className="max-w-xl mx-auto px-4 py-20 text-center bg-slate-950 text-slate-100">
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

  if (totalCartItemsCount === 0 || vendorPackages.length === 0) {
    return (
      <div className="max-w-xl mx-auto px-4 py-24 text-center bg-slate-950 text-slate-100">
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
            Checkout products grouped by vendor package. You can check out one package at a time.
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

      {hasWarnings && (
        <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-4 flex gap-3 text-red-400 mb-6">
          <AlertTriangle size={16} className="shrink-0 mt-0.5 text-red-500 animate-bounce" />
          <div className="text-xs space-y-1">
            <p className="font-bold text-white">Stock Warnings Detected</p>
            <p className="leading-normal">
              Some items in your cart are out of stock or have insufficient quantities. Adjust quantities before checking out those packages.
            </p>
          </div>
        </div>
      )}

      {/* Grid Layout: Vendor Packages List */}
      <div className="space-y-8">
        {vendorPackages?.map((pack: any) => {
          const provider = pack.provider;
          const items = pack.items || [];
          const totals = pack.totals;

          return (
            <div
              key={provider._id}
              className="bg-slate-900/40 border border-slate-850 rounded-xl p-6 space-y-6 backdrop-blur-sm"
            >
              {/* Vendor Group Header */}
              <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-4 gap-4">
                <div>
                  <h2 className="text-lg font-bold text-white">
                    Package Vendor: {provider.businessName || provider.name}
                  </h2>
                  <span className="text-[10px] text-slate-500 font-mono">
                    Stripe Ready: {provider.isStripeReady ? 'Yes' : 'No'}
                  </span>
                </div>
                
                {/* Checkout package button */}
                <Button
                  onClick={() => navigate(`/checkout?providerId=${provider._id}`)}
                  disabled={pack.hasWarnings || items.length === 0 || !provider.isStripeReady}
                  size="sm"
                  className="shadow-md shadow-indigo-600/10 font-bold"
                  leftIcon={<CreditCard size={14} />}
                >
                  Checkout this Package
                </Button>
              </div>

              {/* Grid: package items vs package calculations summary */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left side: Item listings for this package */}
                <div className="lg:col-span-8 space-y-4">
                  {items.map((item: any) => {
                    const product = item.product;
                    const primaryImage = product.images?.[0]?.url || null;
                    const categoryLabel = CATEGORY_LABELS[product.category as ProductCategory] || product.category;

                    return (
                      <div
                        key={product._id}
                        className={`relative flex flex-col sm:flex-row items-start sm:items-center justify-between bg-slate-950/40 border rounded-xl p-4 gap-4 transition-colors ${
                          item.isOutOfStock || item.hasInsufficientStock ? 'border-red-500/20 bg-red-950/5' : 'border-slate-850'
                        }`}
                      >
                        <div className="flex items-start gap-4 flex-grow">
                          <div className="w-16 h-16 bg-slate-900 border border-slate-800 rounded-lg overflow-hidden shrink-0 flex items-center justify-center">
                            {primaryImage ? (
                              <img src={primaryImage} alt={product.title} className="w-full h-full object-cover" />
                            ) : (
                              <Package size={20} className="text-slate-650" />
                            )}
                          </div>
                          <div className="space-y-0.5">
                            <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-wider">
                              {categoryLabel}
                            </span>
                            <h3 className="text-xs font-bold text-white leading-snug line-clamp-1 max-w-[200px] sm:max-w-md">
                              <Link
                                to={`/p/${generateProductSlug(product.title)}/${product._id}`}
                                className="hover:text-indigo-400 transition-colors"
                              >
                                {product.title}
                              </Link>
                            </h3>
                            
                            {/* Warnings */}
                            {item.isOutOfStock ? (
                              <span className="inline-flex items-center gap-1 text-[9px] font-bold text-red-400 mt-1 bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/25">
                                <AlertTriangle size={8} /> Out of stock
                              </span>
                            ) : item.hasInsufficientStock ? (
                              <span className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-500 mt-1 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/25">
                                <AlertTriangle size={8} /> Only {product.stock} left
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-500">Stock: {product.stock} available</span>
                            )}
                          </div>
                        </div>

                        {/* Adjust qty, price and trash */}
                        <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto border-t sm:border-0 border-slate-900 pt-3 sm:pt-0 shrink-0 text-xs">
                          {/* Unit price */}
                          <div className="flex flex-col text-left sm:text-right">
                            <span className="text-[9px] text-slate-500 uppercase tracking-wider">Unit</span>
                            <span className="font-semibold text-slate-300 font-mono">
                              ${product.price.amount.toFixed(2)}
                            </span>
                          </div>

                          {/* Qty Selector */}
                          <div className="flex items-center space-x-1 border border-slate-850 rounded-lg bg-slate-950 p-0.5">
                            <button
                              onClick={() => handleQuantityChange(product._id, item.quantity, item.quantity - 1)}
                              disabled={isUpdating}
                              className="px-1.5 py-0.5 text-slate-400 hover:text-white rounded transition-colors"
                            >
                              <Minus size={8} />
                            </button>
                            <span className="w-6 text-center font-bold text-white font-mono text-[11px]">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => handleQuantityChange(product._id, item.quantity, item.quantity + 1)}
                              disabled={isUpdating || item.quantity >= product.stock}
                              className="px-1.5 py-0.5 text-slate-400 hover:text-white rounded transition-colors disabled:opacity-30"
                            >
                              <Plus size={8} />
                            </button>
                          </div>

                          {/* Subtotal */}
                          <div className="flex flex-col text-right">
                            <span className="text-[9px] text-slate-500 uppercase tracking-wider">Subtotal</span>
                            <span className="font-bold text-indigo-400 font-mono">
                              ${item.subtotal.toFixed(2)}
                            </span>
                          </div>

                          {/* Remove item */}
                          <button
                            onClick={() => handleRemoveItem(product._id)}
                            disabled={isRemoving}
                            className="p-1.5 text-slate-550 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Right side: Package Totals Summary Breakdown */}
                <div className="lg:col-span-4 bg-slate-950/30 border border-slate-850 rounded-xl p-4 space-y-4">
                  <h4 className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest font-mono border-b border-slate-900 pb-1.5">
                    Package Calculations
                  </h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Subtotal</span>
                      <span className="font-mono text-slate-200">${totals.subtotal.toFixed(2)} USD</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Package Shipping</span>
                      <span className="font-mono text-slate-200">${totals.shippingFee.toFixed(2)} USD</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-400 border-b border-slate-850 pb-2">
                      <span>Package Tax (3%)</span>
                      <span className="font-mono text-slate-200">${totals.tax.toFixed(2)} USD</span>
                    </div>
                    <div className="flex items-center justify-between text-sm font-extrabold text-white pt-1">
                      <span>Package Total</span>
                      <span className="font-mono text-indigo-400">${totals.totalAmount.toFixed(2)} USD</span>
                    </div>
                  </div>
                  {!provider.isStripeReady && (
                    <div className="text-[9px] text-amber-500 bg-amber-500/5 border border-amber-500/15 p-2 rounded-lg leading-normal flex gap-1.5">
                      <AlertTriangle size={12} className="shrink-0 mt-0.5" />
                      <span>This vendor has not finished Stripe Connected setup. Checkout is disabled.</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CartPage;
