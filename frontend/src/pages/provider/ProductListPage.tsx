import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  useGetProviderProductsQuery,
  useDeleteProductMutation,
  useUpdateProductMutation,
  IProduct,
} from '../../api/productApi';
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Package,
  ChevronLeft,
  ChevronRight,
  PlusCircle,
  MinusCircle,
  AlertTriangle,
  FolderOpen,
} from 'lucide-react';
import { CATEGORY_LABELS, ProductCategory } from '../../constants/categories';
import Button from '../../components/common/Button';
import Spinner from '../../components/common/Spinner';
import ErrorMessage from '../../components/common/ErrorMessage';
import { useGetStripeStatusQuery } from '../../api/stripeConnectApi';
import StripePayoutStatusCard from '../../components/StripePayoutStatusCard';

const ProductListPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // RTK Query: fetch matching list
  const {
    data: responseData,
    isLoading,
    isFetching,
    error,
  } = useGetProviderProductsQuery(
    {
      page: currentPage,
      limit: itemsPerPage,
      search: searchTerm.trim() || undefined,
      category: selectedCategory || undefined,
      inStock: inStockOnly || undefined,
    },
    { refetchOnMountOrArgChange: true }
  );

  const [deleteProduct, { isLoading: isDeleting }] = useDeleteProductMutation();
  const [updateProduct] = useUpdateProductMutation();

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedCategory(e.target.value);
    setCurrentPage(1);
  };

  const handleStockToggle = () => {
    setInStockOnly(!inStockOnly);
    setCurrentPage(1);
  };

  // Soft delete product operation with confirm dialog
  const handleDelete = async (id: string, title: string) => {
    if (window.confirm(`Are you sure you want to delete "${title}"?`)) {
      try {
        await deleteProduct(id).unwrap();
      } catch (err: any) {
        alert(err?.data?.message || 'Failed to delete product.');
      }
    }
  };

  // Inline stock adjustment using PATCH updateProduct
  const handleStockChange = async (product: IProduct, change: number) => {
    const nextStock = Math.max(0, product.stock + change);
    if (nextStock === product.stock) return;

    // Build form data payload for patch update
    const formData = new FormData();
    formData.append('stock', String(nextStock));

    try {
      await updateProduct({ id: product._id, formData }).unwrap();
    } catch (err: any) {
      console.error('Failed to update stock inline:', err);
    }
  };

  const { data: stripeStatus } = useGetStripeStatusQuery();
  const isStripeReady = stripeStatus?.isStripeReady || false;

  const totalPages = responseData?.totalPages || 1;
  const products = responseData?.products || [];
  const totalItems = responseData?.total || 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 min-h-screen bg-slate-950 text-slate-100">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
            My Product Inventory
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage your store items, adjust stock counts, and create new catalog entries.
          </p>
        </div>
        <Button
          onClick={() => {
            if (!isStripeReady) {
              alert('You must complete your Stripe Connect payout onboarding before listing new products.');
            } else {
              navigate('/products/new');
            }
          }}
          disabled={!isStripeReady}
          title={!isStripeReady ? 'Configure Stripe payouts to add products' : 'Create a new catalog item'}
          leftIcon={<Plus size={16} />}
          className={`shadow-lg ${
            !isStripeReady
              ? 'opacity-50 cursor-not-allowed border-slate-800 bg-slate-900 text-slate-500'
              : 'shadow-indigo-500/20 shadow-indigo-500/10'
          }`}
        >
          Add New Product
        </Button>
      </div>

      {/* Stripe Connect status card */}
      <div className="mb-8">
        <StripePayoutStatusCard />
      </div>

      {/* Filter and search controllers */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 mb-8 backdrop-blur-md">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          {/* Search bar */}
          <div className="md:col-span-5 relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search size={18} />
            </span>
            <input
              type="text"
              placeholder="Search product by title or description..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
            />
          </div>

          {/* Category drop down */}
          <div className="md:col-span-4">
            <select
              value={selectedCategory}
              onChange={handleCategoryChange}
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-300 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
            >
              <option value="">All Categories</option>
              {Object.entries(CATEGORY_LABELS).map(([code, label]) => (
                <option key={code} value={code}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* In stock check box */}
          <div className="md:col-span-3 flex items-center justify-start md:justify-center">
            <label className="flex items-center space-x-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={inStockOnly}
                onChange={handleStockToggle}
                className="w-4 h-4 rounded text-indigo-600 bg-slate-950 border-slate-800 focus:ring-indigo-500 focus:ring-offset-slate-900"
              />
              <span className="text-sm font-medium text-slate-300">In Stock Only</span>
            </label>
          </div>
        </div>
      </div>

      {/* Main product list view */}
      {error ? (
        <ErrorMessage message="An error occurred while loading your inventory. Please check your network or try again." />
      ) : isLoading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Spinner size="lg" className="text-indigo-500" />
          <p className="text-slate-400 mt-4 text-sm font-medium">Fetching active catalog...</p>
        </div>
      ) : products.length === 0 ? (
        <div className="bg-slate-900/30 border border-dashed border-slate-800 rounded-2xl p-16 text-center max-w-2xl mx-auto mt-8">
          <div className="w-16 h-16 rounded-full bg-slate-800/50 flex items-center justify-center mx-auto mb-6 text-indigo-400">
            <Package size={28} />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">No Products Found</h3>
          <p className="text-slate-400 mb-6 text-sm">
            We couldn't find any items in your inventory matching the active filters. Get started by creating your first product listing.
          </p>
          <Link to="/inventory/new">
            <Button leftIcon={<Plus size={16} />}>Create Product</Button>
          </Link>
        </div>
      ) : (
        <div className="relative">
          {/* List spinner overlay */}
          {isFetching && (
            <div className="absolute inset-0 bg-slate-950/20 backdrop-blur-[1px] flex items-center justify-center z-10 rounded-xl" />
          )}

          {/* Table container */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-xl overflow-hidden shadow-2xl backdrop-blur-md">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/60 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    <th className="px-6 py-4">Image</th>
                    <th className="px-6 py-4">Product Name</th>
                    <th className="px-6 py-4">Category</th>
                    <th className="px-6 py-4 text-right">Price</th>
                    <th className="px-6 py-4 text-center">Stock Count</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-sm text-slate-300">
                  {products.map((product) => {
                    const firstImage = product.images?.[0]?.url || '/placeholder.png';
                    const hasLowStock = product.stock > 0 && product.stock < 10;
                    const isOutOfStock = product.stock === 0;

                    return (
                      <tr key={product._id} className="hover:bg-slate-800/30 transition-colors">
                        {/* Column: Image */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <img
                            src={firstImage}
                            alt={product.title}
                            className="w-12 h-12 object-cover rounded-lg border border-slate-800 shadow bg-slate-950"
                          />
                        </td>

                        {/* Column: Title */}
                        <td className="px-6 py-4">
                          <div className="font-semibold text-white truncate max-w-xs sm:max-w-sm">
                            {product.title}
                          </div>
                        </td>

                        {/* Column: Category */}
                        <td className="px-6 py-4 whitespace-nowrap text-slate-400">
                          {CATEGORY_LABELS[product.category as ProductCategory] || product.category}
                        </td>

                        {/* Column: Price */}
                        <td className="px-6 py-4 text-right whitespace-nowrap font-mono font-semibold text-indigo-400">
                          {product.price.amount.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}{' '}
                          {product.price.currency}
                        </td>

                        {/* Column: Stock */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col items-center gap-1.5">
                            {/* Stock modifier controllers */}
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => handleStockChange(product, -1)}
                                className="text-slate-400 hover:text-red-400 active:scale-95 transition-transform"
                                aria-label="Decrease stock"
                                title="Decrease stock by 1"
                              >
                                <MinusCircle size={16} />
                              </button>
                              <span className="w-8 text-center text-sm font-bold text-white font-mono">
                                {product.stock}
                              </span>
                              <button
                                onClick={() => handleStockChange(product, 1)}
                                className="text-slate-400 hover:text-indigo-400 active:scale-95 transition-transform"
                                aria-label="Increase stock"
                                title="Increase stock by 1"
                              >
                                <PlusCircle size={16} />
                              </button>
                            </div>

                            {/* Warning notifications */}
                            {isOutOfStock && (
                              <span className="flex items-center gap-1 text-[10px] font-bold text-red-500 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20">
                                <AlertTriangle size={10} /> OUT OF STOCK
                              </span>
                            )}
                            {hasLowStock && (
                              <span className="flex items-center gap-1 text-[10px] font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                                <AlertTriangle size={10} /> LOW STOCK
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Column: Action Buttons */}
                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end space-x-3">
                            <button
                              onClick={() => navigate(`/inventory/edit/${product._id}`)}
                              className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-md transition-colors"
                              title="Edit product"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() => handleDelete(product._id, product.title)}
                              disabled={isDeleting}
                              className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors disabled:opacity-50"
                              title="Delete product"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Table pagination controller */}
            {totalPages > 1 && (
              <div className="bg-slate-900/30 border-t border-slate-800 px-6 py-4 flex items-center justify-between">
                <div className="text-xs text-slate-400">
                  Showing page <span className="font-semibold text-slate-200">{currentPage}</span> of{' '}
                  <span className="font-semibold text-slate-200">{totalPages}</span> ({totalItems}{' '}
                  items total)
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === 1 || isFetching}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    leftIcon={<ChevronLeft size={14} />}
                  >
                    Prev
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === totalPages || isFetching}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    rightIcon={<ChevronRight size={14} />}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductListPage;
