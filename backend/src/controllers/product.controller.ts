import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { Product, IProduct } from '../models/Product';
import { User } from '../models/User';
import { ApiError } from '../utils/ApiError';
import { ApiResponse } from '../utils/ApiResponse';
import { asyncHandler } from '../utils/asyncHandler';
import { uploadToCloudinary, deleteFromCloudinary } from '../config/cloudinary';

/**
 * Helper function to format Mongoose product output for the API response.
 * Converts internal cents integers to decimal format (dollars) for consumer ease.
 */
const serializeProduct = (product: IProduct) => {
  const doc = product.toObject ? product.toObject() : product;
  return {
    ...doc,
    price: {
      amount: doc.price.amount / 100,
      currency: doc.price.currency,
    },
  };
};

/**
 * Creates a new product for the authenticated Provider.
 * Checks for title conflicts and rolls back Cloudinary uploads in case of Mongoose validation/DB issues.
 */
export const createProduct = asyncHandler(async (req: Request, res: Response) => {
  // Verify Stripe Connect Onboarding status
  if (!req.user.isStripeReady) {
    const provider = await User.findById(req.user._id);
    if (!provider?.isStripeReady) {
      throw new ApiError(403, 'You must configure your Stripe payout details before listing products for sale from My Products page.');
    }
  }

  const { title, description, price, stock, category } = req.body;

  // 1. Image presence validation
  const files = req.files as Express.Multer.File[];
  if (!files || files.length === 0) {
    throw new ApiError(400, 'At least one product image is required');
  }

  // 2. Case-insensitive duplicate title check per provider
  const titleRegex = new RegExp(`^${title.trim()}$`, 'i');
  const existingProduct = await Product.findOne({
    provider: req.user._id,
    title: { $regex: titleRegex },
    isDeleted: false,
  });

  if (existingProduct) {
    throw new ApiError(409, 'A product with this title already exists in your inventory');
  }

  // 3. Parallel upload to Cloudinary
  const uploadPromises = files.map((file) => uploadToCloudinary(file.buffer, 'products'));
  const uploadedImages = await Promise.all(uploadPromises);

  // 4. Mongoose save with Cloudinary rollback trigger
  try {
    const product = await Product.create({
      title: title.trim(),
      description: description.trim(),
      price, // Already formatted to cents (integer) by Zod transform
      stock,
      category: category.trim(),
      images: uploadedImages,
      provider: req.user._id,
    });

    res
      .status(201)
      .json(new ApiResponse(201, serializeProduct(product), 'Product created successfully'));
  } catch (error) {
    // Database save failed: delete uploaded assets from Cloudinary immediately
    const deletePromises = uploadedImages.map((img) => deleteFromCloudinary(img.publicId));
    await Promise.all(deletePromises).catch((cleanupError) => {
      console.error('Failed to clean up Cloudinary assets during Mongoose error rollback:', cleanupError);
    });
    throw error; // Forward original database error to central handler
  }
});

/**
 * Retrieves paginated catalog list of the Provider's active products.
 * Supports page, limit, text search, category, and in-stock filters.
 */
export const getProviderProducts = asyncHandler(async (req: Request, res: Response) => {
  const { page = 1, limit = 10, search, category, inStock } = req.query;

  const queryConditions: any = {
    provider: req.user._id,
    isDeleted: false,
  };

  // Text search on title/description
  if (search) {
    queryConditions.$or = [
      { title: { $regex: String(search), $options: 'i' } },
      { description: { $regex: String(search), $options: 'i' } },
    ];
  }

  // Category filter
  if (category) {
    queryConditions.category = String(category).trim();
  }

  // Stock status filter
  if (inStock === 'true') {
    queryConditions.stock = { $gt: 0 };
  }

  // Pagination computations
  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.max(1, Number(limit) || 10);
  const skip = (pageNum - 1) * limitNum;

  const products = await Product.find(queryConditions)
    .skip(skip)
    .limit(limitNum)
    .sort({ createdAt: -1 });

  const total = await Product.countDocuments(queryConditions);
  const totalPages = Math.ceil(total / limitNum);

  const serializedProducts = products.map((product) => serializeProduct(product));

  res.status(200).json(
    new ApiResponse(
      200,
      { products: serializedProducts, total, page: pageNum, totalPages },
      'Products retrieved successfully'
    )
  );
});

/**
 * Retrieves details of a specific product by ID, verifying provider ownership.
 */
export const getProviderProductById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!Types.ObjectId.isValid(id)) {
    throw new ApiError(400, 'Invalid product ID format');
  }

  const product = await Product.findOne({
    _id: id,
    provider: req.user._id,
    isDeleted: false,
  });

  if (!product) {
    throw new ApiError(404, 'Product not found or access denied');
  }

  res.status(200).json(new ApiResponse(200, serializeProduct(product), 'Product details retrieved successfully'));
});

/**
 * Updates a product catalog entry, managing optional image additions or replacements.
 */
export const updateProduct = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { title, description, price, stock, category, replaceImages } = req.body;

  if (!Types.ObjectId.isValid(id)) {
    throw new ApiError(400, 'Invalid product ID format');
  }

  // 1. Locate product and verify ownership
  const product = await Product.findOne({ _id: id, isDeleted: false });
  if (!product) {
    throw new ApiError(404, 'Product not found');
  }
  if (product.provider.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'Access denied: unauthorized request');
  }

  // 2. Check title uniqueness if modified
  if (title && title.trim().toLowerCase() !== product.title.toLowerCase()) {
    const titleRegex = new RegExp(`^${title.trim()}$`, 'i');
    const duplicate = await Product.findOne({
      provider: req.user._id,
      title: { $regex: titleRegex },
      isDeleted: false,
      _id: { $ne: product._id },
    });
    if (duplicate) {
      throw new ApiError(409, 'A product with this title already exists in your inventory');
    }
    product.title = title.trim();
  }

  // 3. Handle image uploads
  const files = req.files as Express.Multer.File[];
  if (files && files.length > 0) {
    const uploadPromises = files.map((file) => uploadToCloudinary(file.buffer, 'products'));
    const uploadedImages = await Promise.all(uploadPromises);

    const isReplace = replaceImages === 'true' || replaceImages === true;

    if (isReplace) {
      // Delete old images
      const deletePromises = product.images.map((img) => deleteFromCloudinary(img.publicId));
      await Promise.all(deletePromises).catch((cleanupError) => {
        console.error('Failed to delete old assets from Cloudinary during replace update:', cleanupError);
      });
      product.images = uploadedImages;
    } else {
      // Validate maximum bound of 5 images per product
      if (product.images.length + uploadedImages.length > 5) {
        // Rollback uploaded files first to prevent leakage
        const deletePromises = uploadedImages.map((img) => deleteFromCloudinary(img.publicId));
        await Promise.all(deletePromises);
        throw new ApiError(400, 'Image limit exceeded. A product cannot have more than 5 images.');
      }
      product.images = [...product.images, ...uploadedImages];
    }
  }

  // 4. Update text properties dynamically (partial update safety)
  if (description !== undefined) product.description = description.trim();
  if (price !== undefined) {
    product.price = {
      amount: price.amount !== undefined ? price.amount : product.price.amount,
      currency: price.currency !== undefined ? price.currency : product.price.currency,
    };
  }
  if (stock !== undefined) product.stock = stock;
  if (category !== undefined) product.category = category.trim();

  await product.save();

  res.status(200).json(new ApiResponse(200, serializeProduct(product), 'Product updated successfully'));
});

/**
 * Soft deletes a product by toggling the isDeleted boolean flag.
 */
export const deleteProduct = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!Types.ObjectId.isValid(id)) {
    throw new ApiError(400, 'Invalid product ID format');
  }

  const product = await Product.findOne({ _id: id, isDeleted: false });
  if (!product) {
    throw new ApiError(404, 'Product not found');
  }
  if (product.provider.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'Access denied: unauthorized request');
  }

  // Soft delete operation
  product.isDeleted = true;
  await product.save();

  res.status(200).json(new ApiResponse(200, {}, 'Product removed successfully'));
});

/**
 * Public catalog search endpoint.
 * Retrieves all active products, supporting search keyword, category, price boundaries, stock status, and sorting.
 */
export const getProducts = asyncHandler(async (req: Request, res: Response) => {
  const { keyword, category, minPrice, maxPrice, inStock, sortBy, page = 1, limit = 12 } = req.query;

  const queryConditions: any = {
    isDeleted: false,
  };

  // 1. Text Search Filter
  if (keyword) {
    queryConditions.$or = [
      { title: { $regex: String(keyword).trim(), $options: 'i' } },
      { description: { $regex: String(keyword).trim(), $options: 'i' } },
    ];
  }

  // 2. Category Filter
  if (category) {
    queryConditions.category = String(category).trim();
  }

  // 3. Price Filter (Converts decimal bounds to cents)
  if (minPrice !== undefined || maxPrice !== undefined) {
    queryConditions['price.amount'] = {};
    if (minPrice !== undefined && minPrice !== '') {
      const minCents = Math.round(Number(minPrice) * 100);
      if (!isNaN(minCents)) {
        queryConditions['price.amount'].$gte = minCents;
      }
    }
    if (maxPrice !== undefined && maxPrice !== '') {
      const maxCents = Math.round(Number(maxPrice) * 100);
      if (!isNaN(maxCents)) {
        queryConditions['price.amount'].$lte = maxCents;
      }
    }
  }

  // 4. In Stock Filter
  if (inStock === 'true') {
    queryConditions.stock = { $gt: 0 };
  }

  // 5. Sorting Rules
  let sortOption: any = { createdAt: -1 }; // Default: Newest
  if (sortBy === 'price_asc') {
    sortOption = { 'price.amount': 1 };
  } else if (sortBy === 'price_desc') {
    sortOption = { 'price.amount': -1 };
  } else if (sortBy === 'newest') {
    sortOption = { createdAt: -1 };
  } else if (sortBy === 'featured') {
    sortOption = { title: 1 };
  }

  // 6. Pagination Computations
  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.max(1, Number(limit) || 12);
  const skip = (pageNum - 1) * limitNum;

  // Execute database lookup and count in parallel
  const [products, total] = await Promise.all([
    Product.find(queryConditions)
      .populate('provider', 'name email businessName phone')
      .sort(sortOption)
      .skip(skip)
      .limit(limitNum),
    Product.countDocuments(queryConditions),
  ]);

  const totalPages = Math.ceil(total / limitNum);
  const serializedProducts = products.map((product) => serializeProduct(product));

  res.status(200).json(
    new ApiResponse(
      200,
      { products: serializedProducts, total, page: pageNum, totalPages },
      'Products retrieved successfully'
    )
  );
});

/**
 * Public details endpoint.
 * Returns product details by ID, populated with provider profile details.
 */
export const getProductById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!Types.ObjectId.isValid(id)) {
    throw new ApiError(400, 'Invalid product ID format');
  }

  const product = await Product.findOne({
    _id: id,
    isDeleted: false,
  }).populate('provider', 'name email businessName phone');

  if (!product) {
    throw new ApiError(404, 'Product not found');
  }

  res.status(200).json(new ApiResponse(200, serializeProduct(product), 'Product details retrieved successfully'));
});
