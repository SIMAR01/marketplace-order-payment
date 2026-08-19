import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  useCreateProductMutation,
  useUpdateProductMutation,
  useGetProviderProductByIdQuery,
} from '../../api/productApi';
import { PRODUCT_CATEGORIES, CATEGORY_LABELS } from '../../constants/categories';
import { DEFAULT_CURRENCY, SUPPORTED_CURRENCIES } from '../../config/currency.config';
import { ArrowLeft, Save, Upload, AlertCircle, Image as ImageIcon, X } from 'lucide-react';
import Button from '../../components/common/Button';
import FormField from '../../components/common/FormField';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import Spinner from '../../components/common/Spinner';

interface FormErrors {
  title?: string;
  description?: string;
  price?: string;
  stock?: string;
  category?: string;
  images?: string;
}

const ProductFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditMode = !!id;

  // 1. RTK Query: fetch product if in edit mode
  const {
    data: productData,
    isLoading: isLoadingProduct,
    error: fetchError,
  } = useGetProviderProductByIdQuery(id || '', {
    skip: !isEditMode,
    refetchOnMountOrArgChange: true,
  });

  const [createProduct, { isLoading: isCreating }] = useCreateProductMutation();
  const [updateProduct, { isLoading: isUpdating }] = useUpdateProductMutation();

  // 2. Local form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priceAmount, setPriceAmount] = useState('');
  const [priceCurrency, setPriceCurrency] = useState(DEFAULT_CURRENCY);
  const [stock, setStock] = useState('0');
  const [category, setCategory] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<string[]>([]);
  const [replaceImages, setReplaceImages] = useState(false);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);

  // Prepopulate form if in edit mode
  useEffect(() => {
    if (isEditMode && productData) {
      setTitle(productData.title);
      setDescription(productData.description);
      setPriceAmount(String(productData.price.amount));
      setPriceCurrency(productData.price.currency);
      setStock(String(productData.stock));
      setCategory(productData.category);
    }
  }, [isEditMode, productData]);

  // Clean up object URLs when previews change or component unmounts
  useEffect(() => {
    return () => {
      filePreviews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [filePreviews]);

  // Handle files selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setFormErrors((prev) => ({ ...prev, images: undefined }));

    // Limit maximum images
    const currentFilesCount = selectedFiles.length + files.length;
    const existingCount = isEditMode && !replaceImages ? productData?.images?.length || 0 : 0;

    if (currentFilesCount + existingCount > 5) {
      setFormErrors((prev) => ({
        ...prev,
        images: 'A product cannot have more than 5 images in total.',
      }));
      return;
    }

    // Filter file types
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const invalidFiles = files.filter((f) => !validTypes.includes(f.type));
    if (invalidFiles.length > 0) {
      setFormErrors((prev) => ({
        ...prev,
        images: 'Only JPEG, PNG, and WEBP image files are allowed.',
      }));
      return;
    }

    // Filter file sizes (5MB limit)
    const heavyFiles = files.filter((f) => f.size > 5 * 1024 * 1024);
    if (heavyFiles.length > 0) {
      setFormErrors((prev) => ({
        ...prev,
        images: 'Each image must be smaller than 5MB.',
      }));
      return;
    }

    setSelectedFiles((prev) => [...prev, ...files]);

    // Create object URLs for previews
    const newPreviews = files.map((file) => URL.createObjectURL(file));
    setFilePreviews((prev) => [...prev, ...newPreviews]);
  };

  // Remove selected file from upload queue
  const removeSelectedFile = (index: number) => {
    URL.revokeObjectURL(filePreviews[index]);
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setFilePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  // Client side form validation
  const validateForm = (): boolean => {
    const errors: FormErrors = {};

    if (!title.trim()) {
      errors.title = 'Title is required.';
    } else if (title.trim().length < 3) {
      errors.title = 'Title must be at least 3 characters.';
    } else if (title.trim().length > 120) {
      errors.title = 'Title cannot exceed 120 characters.';
    }

    if (!description.trim()) {
      errors.description = 'Description is required.';
    } else if (description.trim().length < 10) {
      errors.description = 'Description must be at least 10 characters.';
    } else if (description.trim().length > 2000) {
      errors.description = 'Description cannot exceed 2000 characters.';
    }

    const priceNum = Number(priceAmount);
    if (!priceAmount.trim() || isNaN(priceNum) || priceNum <= 0) {
      errors.price = 'Price must be a positive number greater than 0.';
    } else if (Number(priceNum.toFixed(2)) !== priceNum) {
      errors.price = 'Price cannot exceed 2 decimal places.';
    }

    const stockNum = Number(stock);
    if (!stock.trim() || isNaN(stockNum) || stockNum < 0 || !Number.isInteger(stockNum)) {
      errors.stock = 'Stock must be a whole non-negative integer.';
    }

    if (!category) {
      errors.category = 'Please select a category.';
    }

    // Images count validations
    const newFilesCount = selectedFiles.length;
    const existingCount = isEditMode && !replaceImages ? productData?.images?.length || 0 : 0;
    const totalImages = newFilesCount + existingCount;

    if (!isEditMode && totalImages === 0) {
      errors.images = 'At least one product image is required.';
    } else if (totalImages > 5) {
      errors.images = 'A product cannot exceed 5 total images.';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    if (!validateForm()) return;

    // Build form data payload for multipart submission
    const formData = new FormData();
    formData.append('title', title.trim());
    formData.append('description', description.trim());
    formData.append('stock', stock);
    formData.append('category', category);

    // Build nested money object and stringify to fit backend preprocess JSON.parse
    const priceObject = {
      amount: Number(priceAmount),
      currency: priceCurrency,
    };
    formData.append('price', JSON.stringify(priceObject));

    // Append file binaries
    selectedFiles.forEach((file) => {
      formData.append('images', file);
    });

    if (isEditMode) {
      formData.append('replaceImages', String(replaceImages));
    }

    try {
      if (isEditMode) {
        await updateProduct({ id: id!, formData }).unwrap();
      } else {
        await createProduct(formData).unwrap();
      }
      navigate('/inventory');
    } catch (err: any) {
      setServerError(
        err?.data?.message || err?.message || 'Failed to submit form. Please check your connection.'
      );
    }
  };

  if (isEditMode && isLoadingProduct) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Spinner size="lg" className="text-indigo-500" />
      </div>
    );
  }

  if (isEditMode && fetchError) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto mb-4 border border-red-500/20">
          <AlertCircle size={24} />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Failed to Load Product</h2>
        <p className="text-slate-400 mb-6">
          The requested product details could not be found or you lack permission to access them.
        </p>
        <Link to="/inventory">
          <Button leftIcon={<ArrowLeft size={16} />} variant="outline">
            Back to Inventory
          </Button>
        </Link>
      </div>
    );
  }

  const isSubmitting = isCreating || isUpdating;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 min-h-screen bg-slate-950 text-slate-100">
      {/* Back breadcrumb */}
      <Link
        to="/inventory"
        className="inline-flex items-center space-x-2 text-xs font-semibold text-slate-400 hover:text-white mb-6 group transition-colors"
      >
        <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
        <span>Back to Inventory</span>
      </Link>

      {/* Page Title */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
          {isEditMode ? 'Edit Product Details' : 'List New Product'}
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          {isEditMode
            ? 'Update titles, modify pricing details, or alter images in your catalog.'
            : 'Fill in catalog information to list your product on the marketplace.'}
        </p>
      </div>

      {serverError && (
        <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-start space-x-3 text-red-400 text-sm">
          <AlertCircle size={18} className="shrink-0 mt-0.5" />
          <span>{serverError}</span>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="space-y-8 bg-slate-900/40 border border-slate-800 rounded-xl p-8 backdrop-blur-md">
        {/* Title */}
        <FormField label="Product Title" error={formErrors.title} required>
          <Input
            placeholder="e.g. Ergonomic wireless keyboard"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setFormErrors((prev) => ({ ...prev, title: undefined }));
            }}
            disabled={isSubmitting}
          />
        </FormField>

        {/* Description */}
        <FormField label="Product Description" error={formErrors.description} required>
          <textarea
            placeholder="Describe features, size details, and warranty guidelines..."
            rows={5}
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              setFormErrors((prev) => ({ ...prev, description: undefined }));
            }}
            disabled={isSubmitting}
            className="w-full px-4 py-2.5 bg-slate-950 border border-slate-850 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors disabled:opacity-50"
          />
        </FormField>

        {/* Category */}
        <FormField label="Category" error={formErrors.category} required>
          <Select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setFormErrors((prev) => ({ ...prev, category: undefined }));
            }}
            disabled={isSubmitting}
          >
            <option value="">Select a category</option>
            {PRODUCT_CATEGORIES.map((code) => (
              <option key={code} value={code}>
                {CATEGORY_LABELS[code]}
              </option>
            ))}
          </Select>
        </FormField>

        {/* Price and Stock Row */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Price Amount */}
          <div className="md:col-span-5">
            <FormField label="Price Amount" error={formErrors.price} required>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="e.g. 89.99"
                value={priceAmount}
                onKeyDown={(e) => {
                  if (['e', 'E', '-', '+'].includes(e.key)) {
                    e.preventDefault();
                  }
                }}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val.includes('-')) return;
                  setPriceAmount(val);
                  setFormErrors((prev) => ({ ...prev, price: undefined }));
                }}
                disabled={isSubmitting}
              />
            </FormField>
          </div>

          {/* Price Currency */}
          <div className="md:col-span-3">
            <FormField label="Currency" required>
              <Select
                value={priceCurrency}
                onChange={(e) => setPriceCurrency(e.target.value)}
                disabled={isSubmitting}
              >
                {SUPPORTED_CURRENCIES.map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </Select>
            </FormField>
          </div>

          {/* Stock Count */}
          <div className="md:col-span-4">
            <FormField label="Stock Quantity" error={formErrors.stock} required>
              <Input
                type="number"
                step="1"
                min="0"
                placeholder="e.g. 150"
                value={stock}
                onKeyDown={(e) => {
                  if (['e', 'E', '-', '+', '.'].includes(e.key)) {
                    e.preventDefault();
                  }
                }}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val.includes('-') || val.includes('.')) return;
                  setStock(val);
                  setFormErrors((prev) => ({ ...prev, stock: undefined }));
                }}
                disabled={isSubmitting}
              />
            </FormField>
          </div>
        </div>

        {/* Images upload slot */}
        <div className="border-t border-slate-800 pt-6">
          <FormField label="Product Images" error={formErrors.images} required={!isEditMode}>
            <div className="flex flex-col gap-4">
              {/* File Dropzone */}
              <div className="relative border-2 border-dashed border-slate-800 hover:border-indigo-500/50 rounded-lg p-6 text-center cursor-pointer transition-colors group bg-slate-950/40">
                <input
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileChange}
                  disabled={isSubmitting}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="flex flex-col items-center justify-center">
                  <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center mb-3 text-slate-400 group-hover:text-indigo-400 group-hover:bg-slate-700/50 transition-colors">
                    <Upload size={18} />
                  </div>
                  <p className="text-sm font-semibold text-white">Click or drag images to upload</p>
                  <p className="text-xs text-slate-500 mt-1">JPEG, PNG, or WEBP. Max 5MB per file. Up to 5 images total.</p>
                </div>
              </div>

              {/* Edit Mode: replace flag toggle */}
              {isEditMode && selectedFiles.length > 0 && (
                <div className="bg-slate-900/60 p-4 border border-slate-800 rounded-lg flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-white">Replace existing product images?</span>
                    <span className="text-[11px] text-slate-400 mt-0.5">
                      Check this option to delete the current product images and use the new ones. Uncheck to append them.
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={replaceImages}
                      onChange={(e) => setReplaceImages(e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600 bg-slate-950 border-slate-800 focus:ring-indigo-500 focus:ring-offset-slate-900"
                    />
                    <span className="text-xs font-bold text-slate-300 ml-2">Replace</span>
                  </label>
                </div>
              )}

              {/* Previews panel */}
              <div className="flex flex-wrap gap-4">
                {/* Render Existing Images in Edit Mode (if not replacing) */}
                {isEditMode && !replaceImages && productData?.images && (
                  <>
                    {productData.images.map((img, i) => (
                      <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-slate-800 bg-slate-950 shrink-0">
                        <img
                          src={img.url}
                          alt={`Existing preview ${i}`}
                          className="w-full h-full object-cover opacity-60"
                        />
                        <span className="absolute bottom-1 right-1 text-[8px] bg-slate-900/80 px-1 py-0.5 rounded text-slate-300 font-semibold border border-slate-700">
                          Current
                        </span>
                      </div>
                    ))}
                  </>
                )}

                {/* Render New Previews */}
                {filePreviews.map((url, i) => (
                  <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-indigo-500/30 bg-slate-950 shrink-0 group">
                    <img src={url} alt={`New preview ${i}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeSelectedFile(i)}
                      className="absolute top-1 right-1 p-0.5 bg-red-600/80 text-white rounded-full hover:bg-red-500 opacity-90 transition-colors"
                      title="Remove image"
                    >
                      <X size={10} />
                    </button>
                    <span className="absolute bottom-1 right-1 text-[8px] bg-indigo-600/90 px-1 py-0.5 rounded text-white font-semibold">
                      New
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </FormField>
        </div>

        {/* Submit controls */}
        <div className="border-t border-slate-800 pt-6 flex items-center justify-end space-x-4">
          <Link to="/inventory">
            <Button variant="outline" disabled={isSubmitting}>
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            disabled={isSubmitting}
            leftIcon={isSubmitting ? <Spinner size="sm" /> : <Save size={16} />}
          >
            {isSubmitting ? 'Saving changes...' : isEditMode ? 'Update Product' : 'Create Product'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default ProductFormPage;
