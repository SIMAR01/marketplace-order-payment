import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useGetProductByIdQuery, IProviderInfo } from '../api/productApi';
import { CATEGORY_LABELS, ProductCategory } from '../constants/categories';
import { generateProductSlug } from '../utils/slug';
import {
  ChevronLeft,
  ChevronRight,
  ShoppingBag,
  Package,
  AlertTriangle,
  Check,
  ShieldCheck,
  Building,
  Mail,
  Phone,
  ArrowLeft,
  RefreshCw,
  ShoppingBagIcon,
} from 'lucide-react';
import Button from '../components/common/Button';
import Spinner from '../components/common/Spinner';

// Skeleton loader block for the Product Detail Page (PDP)
const SkeletonPDP: React.FC = () => (
  <div className="max-w-7xl mx-auto px-4 py-8 animate-pulse space-y-8">
    <div className="h-4 bg-slate-800 rounded w-1/4" />
    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
      <div className="space-y-4">
        <div className="aspect-square bg-slate-800 rounded-xl w-full" />
        <div className="flex gap-4">
          <div className="w-16 h-16 bg-slate-800 rounded-lg" />
          <div className="w-16 h-16 bg-slate-800 rounded-lg" />
          <div className="w-16 h-16 bg-slate-800 rounded-lg" />
        </div>
      </div>
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="h-4 bg-slate-800 rounded w-1/3" />
          <div className="h-8 bg-slate-800 rounded w-5/6" />
        </div>
        <div className="h-6 bg-slate-800 rounded w-1/4" />
        <div className="h-20 bg-slate-800 rounded w-full" />
        <div className="h-10 bg-slate-800 rounded w-1/2" />
      </div>
    </div>
  </div>
);

const ProductDetailPage: React.FC = () => {
  const { slug, id } = useParams<{ slug: string; id: string }>();
  const navigate = useNavigate();

  // 1. RTK Query: fetch product details
  const {
    data: product,
    isLoading,
    error,
    refetch,
  } = useGetProductByIdQuery(id || '', {
    skip: !id,
    refetchOnMountOrArgChange: true,
  });

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imageErrors, setImageErrors] = useState<Record<number, boolean>>({});
  const [quantity, setQuantity] = useState(1);

  // Cart action states for instant UI feedback
  const [isAdding, setIsAdding] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);

  const images = product?.images || [];
  const stock = product?.stock ?? 0;
  const isOutOfStock = stock === 0;
  const isLowStock = stock > 0 && stock < 10;

  // 2. Canonical SEO Slug Redirect check
  useEffect(() => {
    if (product) {
      const correctSlug = generateProductSlug(product.title);
      if (slug !== correctSlug) {
        navigate(`/p/${correctSlug}/${product._id}`, { replace: true });
      }
    }
  }, [product, slug, navigate]);

  // 3. Carousel Keyboard Arrow Navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (images.length <= 1) return;
      if (e.key === 'ArrowLeft') {
        setCurrentImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
      } else if (e.key === 'ArrowRight') {
        setCurrentImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [images]);

  const handleNextImage = () => {
    setCurrentImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const handlePrevImage = () => {
    setCurrentImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  // Quantity boundaries modifiers
  const handleQuantityIncrement = () => {
    setQuantity((q) => Math.min(stock, q + 1));
  };

  const handleQuantityDecrement = () => {
    setQuantity((q) => Math.max(1, q - 1));
  };

  // Add to cart simulated action (RTK Query Cart mutation can be wired here)
  const handleAddToCart = () => {
    if (isOutOfStock) return;
    setIsAdding(true);
    setTimeout(() => {
      setIsAdding(false);
      setAddedToCart(true);
      setTimeout(() => setAddedToCart(false), 2500);
    }, 850);
  };

  if (isLoading) {
    return <SkeletonPDP />;
  }

  if (error || !product) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <div className="w-14 h-14 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto mb-6 border border-red-500/20 animate-bounce">
          <AlertTriangle size={24} />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Product Not Found</h2>
        <p className="text-slate-400 mb-6 text-sm">
          The requested product details could not be retrieved. It may have been removed or the ID is invalid.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link to="/products">
            <Button variant="outline" leftIcon={<ArrowLeft size={16} />}>
              Back to Catalog
            </Button>
          </Link>
          <Button onClick={() => refetch()} leftIcon={<RefreshCw size={14} />}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  // Typecast populated provider details
  const provider = product.provider as IProviderInfo;
  const categoryLabel = CATEGORY_LABELS[product.category as ProductCategory] || product.category;
  const isImageFailing = imageErrors[currentImageIndex];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 min-h-screen bg-slate-950 text-slate-100">
      {/* Category Breadcrumbs */}
      <nav className="flex items-center space-x-2 text-xs font-semibold text-slate-500 mb-8 overflow-x-auto whitespace-nowrap">
        <Link to="/products" className="hover:text-white transition-colors">
          Shop
        </Link>
        <span>/</span>
        <Link to={`/products?category=${product.category}`} className="hover:text-white transition-colors">
          {categoryLabel}
        </Link>
        <span>/</span>
        <span className="text-slate-300 truncate max-w-[200px] sm:max-w-xs">{product.title}</span>
      </nav>

      {/* Grid Layout:stacks 1 col on mobile, 2 col on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        {/* Left Column: Media & Specs */}
        <div className="lg:col-span-7 space-y-8">
          {/* Main Image Slider */}
          <div className="relative aspect-square w-full bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-md flex items-center justify-center">
            {images.length > 0 && !isImageFailing ? (
              <img
                src={images[currentImageIndex].url}
                alt={`${product.title} view ${currentImageIndex}`}
                onError={() => setImageErrors((prev) => ({ ...prev, [currentImageIndex]: true }))}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-slate-500 gap-2">
                <Package size={48} className="text-slate-700 stroke-[1.5]" />
                <span className="text-sm">No image preview available</span>
              </div>
            )}

            {/* Slider chevron buttons (hidden when images.length <= 1) */}
            {images.length > 1 && (
              <>
                <button
                  onClick={handlePrevImage}
                  className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-slate-950/60 border border-slate-800 backdrop-blur-md text-slate-400 hover:text-white hover:bg-slate-950/80 transition-all shadow"
                  aria-label="Previous image"
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  onClick={handleNextImage}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-slate-950/60 border border-slate-800 backdrop-blur-md text-slate-400 hover:text-white hover:bg-slate-950/80 transition-all shadow"
                  aria-label="Next image"
                >
                  <ChevronRight size={20} />
                </button>
              </>
            )}
          </div>

          {/* Bottom Thumbnails */}
          {images.length > 1 && (
            <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-thin">
              {images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentImageIndex(i)}
                  className={`relative w-20 h-20 rounded-lg overflow-hidden border bg-slate-900 shrink-0 transition-all duration-200 ${
                    currentImageIndex === i
                      ? 'border-indigo-500 ring-2 ring-indigo-500/20'
                      : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <img src={img.url} alt={`Thumbnail ${i}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}

          {/* Product description details */}
          <div className="border-t border-slate-800/80 pt-8">
            <h2 className="text-xl font-bold text-white mb-4">Product Description</h2>
            <div className="text-slate-350 text-sm leading-relaxed whitespace-pre-wrap">
              {product.description}
            </div>
          </div>
        </div>

        {/* Right Column: Checkout panel & Merchant Details */}
        <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-24">
          <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-6 space-y-6 backdrop-blur-md">
            {/* Header info */}
            <div>
              <span className="text-[10px] bg-indigo-500/10 text-indigo-400 font-bold px-2 py-0.5 rounded-full border border-indigo-500/20 uppercase tracking-wider">
                {categoryLabel}
              </span>
              <h1 className="text-2xl font-extrabold text-white mt-3 leading-snug">
                {product.title}
              </h1>
            </div>

            {/* Price tag */}
            <div className="border-t border-slate-800/80 pt-4 flex flex-col">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">List Price</span>
              <span className="text-3xl font-black text-indigo-400 mt-1 font-mono">
                {product.price.amount.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{' '}
                <span className="text-lg font-sans font-bold text-slate-400">{product.price.currency}</span>
              </span>
            </div>

            {/* Verified Merchant Provider Card */}
            {provider && (
              <div className="bg-slate-950/60 border border-slate-850 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-850 pb-2">
                  <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1">
                    <Building size={12} /> Merchant Profile
                  </div>
                  <span className="flex items-center gap-1 text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold px-1.5 py-0.5 rounded">
                    <ShieldCheck size={10} /> Verified
                  </span>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">
                    {provider.businessName || provider.name}
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5">
                    <Mail size={12} className="text-slate-500" /> {provider.email}
                  </p>
                  {provider.phone && (
                    <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5">
                      <Phone size={12} className="text-slate-500" /> {provider.phone}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Stock status indicator */}
            <div className="space-y-4">
              <div className="text-xs font-semibold">
                {isOutOfStock ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-500/10 text-red-500 border border-red-500/20 rounded-md">
                    <AlertTriangle size={14} /> Out of Stock
                  </span>
                ) : isLowStock ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-md animate-pulse">
                    <AlertTriangle size={14} /> Only {stock} units left in stock — order soon!
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-md">
                    In Stock ({stock} available)
                  </span>
                )}
              </div>

              {/* Quantity selector controls */}
              {!isOutOfStock && (
                <div className="flex items-center justify-between border-t border-slate-800/80 pt-4">
                  <span className="text-sm text-slate-400 font-semibold">Quantity</span>
                  <div className="flex items-center space-x-1 border border-slate-850 rounded-lg bg-slate-950 p-1">
                    <button
                      onClick={handleQuantityDecrement}
                      disabled={quantity <= 1}
                      className="px-2.5 py-1 text-slate-400 hover:text-white rounded transition-colors disabled:opacity-30"
                      aria-label="Decrease quantity"
                    >
                      —
                    </button>
                    <span className="w-8 text-center text-sm font-bold text-white font-mono">
                      {quantity}
                    </span>
                    <button
                      onClick={handleQuantityIncrement}
                      disabled={quantity >= stock}
                      className="px-2.5 py-1 text-slate-400 hover:text-white rounded transition-colors disabled:opacity-30"
                      aria-label="Increase quantity"
                    >
                      +
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Action CTA Buttons */}
            <div className="space-y-3 pt-2">
              <Button
                onClick={handleAddToCart}
                disabled={isOutOfStock || isAdding}
                className="w-full relative shadow-md shadow-indigo-500/10"
                leftIcon={
                  isAdding ? (
                    <Spinner size="sm" />
                  ) : addedToCart ? (
                    <Check size={16} />
                  ) : (
                    <ShoppingBag size={16} />
                  )
                }
              >
                {isAdding ? 'Adding to cart...' : addedToCart ? 'Added to Cart!' : 'Add to Cart'}
              </Button>
              <Button
                variant="outline"
                className="w-full text-slate-300 hover:text-white border-slate-800"
                disabled={isOutOfStock}
                onClick={() => alert(`Proceeding to buy ${quantity} unit(s).`)}
              >
                Buy Now
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailPage;
