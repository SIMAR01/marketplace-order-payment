import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useGetProductsQuery } from '../api/productApi';
import { PRODUCT_CATEGORIES, CATEGORY_LABELS } from '../constants/categories';
import ProductCard from '../components/ProductCard';
import {
  Search,
  SlidersHorizontal,
  X,
  ChevronLeft,
  ChevronRight,
  PackageX,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import Button from '../components/common/Button';
import Spinner from '../components/common/Spinner';

// Skeleton loader block for product grid entries
const SkeletonCard: React.FC = () => (
  <div className="bg-slate-900/20 border border-slate-800/80 rounded-xl overflow-hidden animate-pulse h-full flex flex-col">
    <div className="w-full aspect-square bg-slate-800/40" />
    <div className="p-5 flex flex-col flex-grow justify-between">
      <div>
        <div className="h-3 bg-slate-800/40 rounded w-1/4 mb-3" />
        <div className="h-4 bg-slate-800/40 rounded w-5/6 mb-2" />
        <div className="h-4 bg-slate-800/40 rounded w-1/2 mb-4" />
      </div>
      <div className="flex items-center justify-between border-t border-slate-800/60 pt-3">
        <div className="h-5 bg-slate-800/40 rounded w-1/3 font-mono" />
        <div className="h-3 bg-slate-800/40 rounded w-1/4" />
      </div>
    </div>
  </div>
);

const ProductsSearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);

  // 1. Read URL Search Params
  const keyword = searchParams.get('keyword') || '';
  const category = searchParams.get('category') || '';
  const sortBy = searchParams.get('sortBy') || 'newest';
  const minPrice = searchParams.get('minPrice') || '';
  const maxPrice = searchParams.get('maxPrice') || '';
  const inStock = searchParams.get('inStock') === 'true';
  const page = Number(searchParams.get('page')) || 1;
  const limit = 12;

  // Local inputs (debounced searches and price controls)
  const [keywordInput, setKeywordInput] = useState(keyword);
  const [minPriceInput, setMinPriceInput] = useState(minPrice);
  const [maxPriceInput, setMaxPriceInput] = useState(maxPrice);

  // 2. Debounce Keyword Search
  useEffect(() => {
    const handler = setTimeout(() => {
      updateSearchParam('keyword', keywordInput.trim() || null);
    }, 350);
    return () => clearTimeout(handler);
  }, [keywordInput]);

  // Sync state if URL changes from outside (e.g. back navigation)
  useEffect(() => {
    setKeywordInput(keyword);
    setMinPriceInput(minPrice);
    setMaxPriceInput(maxPrice);
  }, [keyword, minPrice, maxPrice]);

  // 3. RTK Query: fetch products catalog
  const {
    data: responseData,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useGetProductsQuery({
    page,
    limit,
    keyword: keyword || undefined,
    category: category || undefined,
    sortBy: sortBy || undefined,
    minPrice: minPrice ? Number(minPrice) : undefined,
    maxPrice: maxPrice ? Number(maxPrice) : undefined,
    inStock: inStock || undefined,
  });

  // URL search params updates (resets page to 1 on filter modifications)
  const updateSearchParam = (key: string, value: string | null) => {
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    if (key !== 'page') {
      newParams.set('page', '1');
    }
    setSearchParams(newParams);
  };

  const handlePriceApply = (e: React.FormEvent) => {
    e.preventDefault();
    const newParams = new URLSearchParams(searchParams);
    if (minPriceInput.trim()) {
      newParams.set('minPrice', minPriceInput);
    } else {
      newParams.delete('minPrice');
    }
    if (maxPriceInput.trim()) {
      newParams.set('maxPrice', maxPriceInput);
    } else {
      newParams.delete('maxPrice');
    }
    newParams.set('page', '1');
    setSearchParams(newParams);
  };

  const handleClearAll = () => {
    setSearchParams({});
    setKeywordInput('');
    setMinPriceInput('');
    setMaxPriceInput('');
    setIsFilterDrawerOpen(false);
  };

  // Compute active filter counts for drawer badge
  const activeFiltersCount = [
    keyword,
    category,
    minPrice,
    maxPrice,
    inStock ? 'true' : '',
  ].filter(Boolean).length;

  const totalPages = responseData?.totalPages || 1;
  const products = responseData?.products || [];
  const totalItems = responseData?.total || 0;

  // Render Left Side Filters (reused in desktop sidebar and mobile drawer)
  const renderFiltersContent = () => (
    <div className="space-y-6">
      {/* Category Selection */}
      <div>
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Categories</h3>
        <div className="space-y-2">
          <button
            onClick={() => updateSearchParam('category', null)}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
              !category
                ? 'bg-indigo-500/10 text-indigo-400 font-semibold border border-indigo-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
            }`}
          >
            All Categories
          </button>
          {PRODUCT_CATEGORIES.map((code) => (
            <button
              key={code}
              onClick={() => updateSearchParam('category', code)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                category === code
                  ? 'bg-indigo-500/10 text-indigo-400 font-semibold border border-indigo-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
              }`}
            >
              {CATEGORY_LABELS[code]}
            </button>
          ))}
        </div>
      </div>

      {/* Price Filter range */}
      <div className="border-t border-slate-800/80 pt-6">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Price Range</h3>
        <form onSubmit={handlePriceApply} className="space-y-3">
          <div className="flex items-center gap-2">
            <input
              type="number"
              placeholder="Min"
              min="0"
              value={minPriceInput}
              onChange={(e) => setMinPriceInput(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-mono"
            />
            <span className="text-slate-600">—</span>
            <input
              type="number"
              placeholder="Max"
              min="0"
              value={maxPriceInput}
              onChange={(e) => setMaxPriceInput(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-mono"
            />
          </div>
          <Button type="submit" size="sm" variant="outline" className="w-full">
            Apply Prices
          </Button>
        </form>
      </div>

      {/* Stock availability */}
      <div className="border-t border-slate-800/80 pt-6">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Availability</h3>
        <label className="flex items-center space-x-3 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={inStock}
            onChange={(e) => updateSearchParam('inStock', e.target.checked ? 'true' : null)}
            className="w-4 h-4 rounded text-indigo-600 bg-slate-950 border-slate-850 focus:ring-indigo-500 focus:ring-offset-slate-900"
          />
          <span className="text-sm font-semibold text-slate-300">In Stock Only</span>
        </label>
      </div>

      {/* Clear Button */}
      {activeFiltersCount > 0 && (
        <Button onClick={handleClearAll} size="sm" variant="ghost" className="w-full text-red-400 hover:text-red-300">
          Clear All Filters
        </Button>
      )}
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 min-h-screen bg-slate-950 text-slate-100">
      {/* Top Banner layout */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
          Explore Products
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Browse verified merchant items, filter categories, and search the public catalog.
        </p>
      </div>

      {/* Toolbar Search Header */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 mb-8 flex flex-col md:flex-row items-center justify-between gap-4 backdrop-blur-md">
        {/* Search input field */}
        <div className="w-full md:max-w-md relative">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
            <Search size={16} />
          </span>
          <input
            type="text"
            placeholder="Search by title or keyword..."
            value={keywordInput}
            onChange={(e) => setKeywordInput(e.target.value)}
            className="w-full pl-10 pr-10 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
          {keywordInput && (
            <button
              onClick={() => {
                setKeywordInput('');
                updateSearchParam('keyword', null);
              }}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-white"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Mobile Filter & Sorting Controllers */}
        <div className="w-full md:w-auto flex items-center justify-between md:justify-end gap-3 self-stretch">
          {/* Mobile Filter Toggle */}
          <button
            onClick={() => setIsFilterDrawerOpen(true)}
            className="md:hidden flex items-center gap-2 px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm font-semibold text-slate-300 hover:text-white"
          >
            <SlidersHorizontal size={14} />
            <span>Filters</span>
            {activeFiltersCount > 0 && (
              <span className="bg-indigo-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {activeFiltersCount}
              </span>
            )}
          </button>

          {/* Sorting Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider hidden sm:inline">Sort By</span>
            <select
              value={sortBy}
              onChange={(e) => updateSearchParam('sortBy', e.target.value)}
              className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-300 focus:outline-none focus:border-indigo-500 transition-colors"
            >
              <option value="newest">Newest Arrivals</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="featured">Featured (A-Z)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        {/* Desktop Sidebar Filters */}
        <aside className="hidden md:block md:col-span-3 sticky top-24 self-start bg-slate-900/20 border border-slate-800/80 rounded-xl p-5 backdrop-blur-md">
          {renderFiltersContent()}
        </aside>

        {/* Product listing grid */}
        <main className="md:col-span-9 relative">
          {isFetching && !isLoading && (
            <div className="absolute inset-0 bg-slate-950/20 backdrop-blur-[1px] flex items-center justify-center z-10 rounded-xl" />
          )}

          {error ? (
            <div className="bg-slate-900/30 border border-slate-800/80 rounded-2xl p-16 text-center max-w-lg mx-auto mt-8">
              <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto mb-4 border border-red-500/20">
                <AlertCircle size={22} />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Failed to Fetch Catalog</h3>
              <p className="text-slate-400 mb-6 text-sm">
                An unexpected error occurred while contacting the server. Please check your network connection and try again.
              </p>
              <Button onClick={() => refetch()} leftIcon={<RefreshCw size={14} />}>
                Try Again
              </Button>
            </div>
          ) : isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="aspect-[4/5] w-full">
                  <SkeletonCard />
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="bg-slate-900/20 border border-dashed border-slate-800/80 rounded-2xl p-16 text-center max-w-xl mx-auto mt-8">
              <div className="w-12 h-12 rounded-full bg-slate-800/50 flex items-center justify-center mx-auto mb-4 text-slate-400">
                <PackageX size={20} />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">No Products Match Filters</h3>
              <p className="text-slate-400 mb-6 text-sm">
                We couldn't find any items in our catalog matching your search criteria. Try modifying your search phrase or resetting filters.
              </p>
              <Button onClick={handleClearAll}>Reset Search Filters</Button>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Product cards list */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map((product) => (
                  <div key={product._id} className="h-full">
                    <ProductCard product={product} />
                  </div>
                ))}
              </div>

              {/* Paginated Footer controllers */}
              {totalPages > 1 && (
                <div className="bg-slate-900/20 border border-slate-800 px-6 py-4 rounded-xl flex items-center justify-between">
                  <div className="text-xs text-slate-400">
                    Showing <span className="font-semibold text-slate-200">{products.length}</span> of{' '}
                    <span className="font-semibold text-slate-200">{totalItems}</span> matching products
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page === 1 || isFetching}
                      onClick={() => updateSearchParam('page', String(page - 1))}
                      leftIcon={<ChevronLeft size={14} />}
                    >
                      Prev
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page === totalPages || isFetching}
                      onClick={() => updateSearchParam('page', String(page + 1))}
                      rightIcon={<ChevronRight size={14} />}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Collapsible Mobile Drawer Filters */}
      {isFilterDrawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex justify-end">
          {/* Backdrop overlay */}
          <div
            onClick={() => setIsFilterDrawerOpen(false)}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm"
          />

          {/* Drawer container panel */}
          <div className="relative w-full max-w-xs bg-slate-900 border-l border-slate-800 h-full p-6 flex flex-col overflow-y-auto shadow-2xl z-10">
            <div className="flex items-center justify-between border-b border-slate-850 pb-4 mb-6">
              <h2 className="font-bold text-white flex items-center gap-2">
                <SlidersHorizontal size={16} /> Filters
              </h2>
              <button
                onClick={() => setIsFilterDrawerOpen(false)}
                className="p-1 hover:bg-slate-800 rounded-md text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>
            {renderFiltersContent()}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductsSearchPage;
