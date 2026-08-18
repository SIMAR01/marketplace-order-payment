import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { IProduct } from '../api/productApi';
import {
  useGetCartQuery,
  useAddToCartMutation,
  useRemoveFromCartMutation,
} from '../api/cartApi';
import { useAppSelector } from '../hooks/storeHooks';
import { CATEGORY_LABELS, ProductCategory } from '../constants/categories';
import { generateProductSlug } from '../utils/slug';
import { Package, AlertCircle, ShoppingCart, Trash2, Check, Loader2 } from 'lucide-react';

interface ProductCardProps {
  product: IProduct;
}

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const navigate = useNavigate();
  const [imageError, setImageError] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // 1. Auth status selector
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);

  // 2. RTK Query: fetch active customer cart
  const isCustomer = isAuthenticated && user?.role === 'CUSTOMER';
  const { data: cart } = useGetCartQuery(undefined, {
    skip: !isCustomer,
  });

  const [addToCart] = useAddToCartMutation();
  const [removeFromCart] = useRemoveFromCartMutation();

  const slug = generateProductSlug(product.title);
  const imageUrl = !imageError && product.images?.[0]?.url ? product.images[0].url : null;
  const categoryLabel = CATEGORY_LABELS[product.category as ProductCategory] || product.category;

  const isOutOfStock = product.stock === 0;
  const isLowStock = product.stock > 0 && product.stock < 10;

  // Check if product is already in the cart
  const isAlreadyInCart = cart?.items.some((item) => item.product._id === product._id) || false;

  // Floating button quick cart add trigger (Stops card link navigation click events)
  const handleQuickCartAction = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      navigate('/login', { state: { from: '/products' } });
      return;
    }

    if (user?.role !== 'CUSTOMER') {
      alert('Only customers can add items to cart');
      return;
    }

    setIsProcessing(true);
    try {
      if (isAlreadyInCart) {
        await removeFromCart(product._id).unwrap();
      } else {
        await addToCart({ productId: product._id, quantity: 1 }).unwrap();
      }
    } catch (err: any) {
      alert(err?.data?.message || 'Cart operation failed');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Link
      to={`/p/${slug}/${product._id}`}
      className="group flex flex-col bg-slate-900/40 border border-slate-800 rounded-xl overflow-hidden hover:border-slate-700/80 hover:shadow-2xl hover:shadow-indigo-500/5 transition-all duration-300 h-full backdrop-blur-sm"
    >
      {/* Image container */}
      <div className="relative aspect-square w-full bg-slate-950/60 overflow-hidden border-b border-slate-800">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={product.title}
            onError={() => setImageError(true)}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 gap-2">
            <Package size={32} className="text-slate-600 stroke-[1.5]" />
            <span className="text-xs">No image available</span>
          </div>
        )}

        {/* Floating Category Badge */}
        <span className="absolute top-3 left-3 bg-slate-950/80 backdrop-blur-md text-[10px] font-bold text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider z-10">
          {categoryLabel}
        </span>

        {/* Floating Quick Add/Remove Cart Button */}
        {!isOutOfStock && (!isAuthenticated || user?.role === 'CUSTOMER') && (
          <button
            onClick={handleQuickCartAction}
            disabled={isProcessing}
            className={`absolute top-3 right-3 p-2 rounded-full border shadow backdrop-blur-md transition-all duration-300 z-10 ${
              isProcessing
                ? 'bg-slate-900/85 border-slate-800 text-slate-400'
                : isAlreadyInCart
                ? 'bg-red-600/90 hover:bg-red-700 border-red-500/30 text-white hover:scale-105'
                : 'bg-indigo-600/90 hover:bg-indigo-700 border-indigo-500/30 text-white hover:scale-105'
            }`}
            title={isAlreadyInCart ? 'Remove from Cart' : 'Quick Add to Cart'}
          >
            {isProcessing ? (
              <Loader2 size={14} className="animate-spin" />
            ) : isAlreadyInCart ? (
              <Trash2 size={14} />
            ) : (
              <ShoppingCart size={14} />
            )}
          </button>
        )}

        {/* Floating Stock Warning Badge */}
        {isOutOfStock && (
          <div className="absolute inset-0 bg-slate-950/60 flex items-center justify-center">
            <span className="bg-red-600/90 text-white text-xs font-extrabold uppercase px-3 py-1 rounded-md tracking-wider border border-red-500/20">
              Out of Stock
            </span>
          </div>
        )}
      </div>

      {/* Details container */}
      <div className="p-5 flex flex-col flex-grow">
        {/* Title */}
        <h3 className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors line-clamp-2 leading-snug flex-grow mb-2">
          {product.title}
        </h3>

        {/* Stock text alerts */}
        <div className="mb-4 text-xs font-semibold">
          {isOutOfStock ? (
            <span className="text-red-500 flex items-center gap-1">
              <AlertCircle size={12} /> Out of stock
            </span>
          ) : isLowStock ? (
            <span className="text-amber-500 flex items-center gap-1 animate-pulse">
              <AlertCircle size={12} /> Only {product.stock} left — order soon!
            </span>
          ) : (
            <span className="text-emerald-500">In Stock ({product.stock} available)</span>
          )}
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-between border-t border-slate-800/80 pt-3 mt-auto">
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Price</span>
            <span className="text-base font-bold text-indigo-400 font-mono">
              {product.price.amount.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{' '}
              <span className="text-xs text-slate-400 font-sans">{product.price.currency}</span>
            </span>
          </div>
          <span className="text-xs font-bold text-indigo-400 group-hover:translate-x-0.5 transition-transform duration-200">
            View Details &rarr;
          </span>
        </div>
      </div>
    </Link>
  );
};

export default ProductCard;
