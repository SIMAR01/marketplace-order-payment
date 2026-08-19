import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { Cart } from '../models/Cart';
import { Product } from '../models/Product';
import { ApiError } from '../utils/ApiError';
import { ApiResponse } from '../utils/ApiResponse';
import { asyncHandler } from '../utils/asyncHandler';

/**
 * Helper to dynamically group cart items into vendor-specific packages.
 * Calculates totals (shipping fee & tax) individually per vendor package.
 */
const serializeCart = (cart: any) => {
  const itemsByProvider: Record<string, { provider: any; items: any[] }> = {};

  for (const item of cart.items) {
    const product = item.product;
    if (!product || product.isDeleted) {
      continue;
    }

    const provider = product.provider;
    if (!provider) {
      continue;
    }
    const providerId = provider._id.toString();

    if (!itemsByProvider[providerId]) {
      itemsByProvider[providerId] = {
        provider: {
          _id: provider._id,
          name: provider.name,
          businessName: provider.businessName,
          stripeAccountId: provider.stripeAccountId,
          isStripeReady: provider.isStripeReady,
        },
        items: [],
      };
    }

    const priceCents = product.price.amount;
    const itemSubtotalCents = item.quantity * priceCents;
    const isOutOfStock = product.stock === 0;
    const hasInsufficientStock = item.quantity > product.stock;

    itemsByProvider[providerId].items.push({
      product: {
        _id: product._id,
        title: product.title,
        description: product.description,
        price: {
          amount: priceCents / 100, // Return standard decimal format (dollars)
          currency: product.price.currency,
        },
        stock: product.stock,
        category: product.category,
        images: product.images,
        isDeleted: product.isDeleted,
      },
      quantity: item.quantity,
      subtotal: itemSubtotalCents / 100,
      isOutOfStock,
      hasInsufficientStock,
    });
  }

  const vendorPackages = Object.values(itemsByProvider).map(({ provider, items }) => {
    const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
    const shippingFee = subtotal > 0 ? 5.0 : 0;
    const tax = Math.round(subtotal * 0.03 * 100) / 100;
    const totalAmount = Math.round((subtotal + shippingFee + tax) * 100) / 100;
    const hasWarnings = items.some((item) => item.isOutOfStock || item.hasInsufficientStock);

    return {
      provider,
      items,
      totals: {
        subtotal,
        shippingFee,
        tax,
        totalAmount,
      },
      hasWarnings,
    };
  });

  return {
    _id: cart._id,
    user: cart.user,
    vendorPackages,
    totalCartItemsCount: cart.items.reduce((sum: number, item: any) => sum + (item.product?.isDeleted ? 0 : item.quantity), 0),
    hasWarnings: vendorPackages.some((vp) => vp.hasWarnings),
  };
};

// Utility to populate cart with products and their providers
const populateCart = (query: any) => {
  return query.populate({
    path: 'items.product',
    populate: { path: 'provider', select: 'name businessName stripeAccountId isStripeReady' },
  });
};

/**
 * Retrieves the authenticated customer's active cart.
 * Automatically creates an empty cart if none is found.
 */
export const getCart = asyncHandler(async (req: Request, res: Response) => {
  if (req.user.role !== 'CUSTOMER') {
    throw new ApiError(403, 'Only customers can view or manage shopping carts');
  }

  let cart = await populateCart(Cart.findOne({ user: req.user._id }));

  if (!cart) {
    cart = await Cart.create({ user: req.user._id, items: [] });
    // Reload to apply population
    cart = await populateCart(Cart.findById(cart._id));
  }

  res.status(200).json(new ApiResponse(200, serializeCart(cart), 'Cart retrieved successfully'));
});

/**
 * Adds an item to the shopping cart or increments its quantity.
 * Validates role restrictions, product availability, and stock bounds.
 */
export const addToCart = asyncHandler(async (req: Request, res: Response) => {
  if (req.user.role !== 'CUSTOMER') {
    throw new ApiError(403, 'Only customers can add items to cart');
  }

  const { productId, quantity = 1 } = req.body;

  if (!productId || !Types.ObjectId.isValid(productId)) {
    throw new ApiError(400, 'A valid product ID is required');
  }

  const quantityNum = Number(quantity);
  if (isNaN(quantityNum) || quantityNum < 1) {
    throw new ApiError(400, 'Quantity must be a positive integer greater than 0');
  }

  // 1. Check product availability
  const product = await Product.findOne({ _id: productId, isDeleted: false });
  if (!product) {
    throw new ApiError(404, 'Product not found or unavailable');
  }

  // 2. Load or create user's cart
  let cart = await Cart.findOne({ user: req.user._id });
  if (!cart) {
    cart = new Cart({ user: req.user._id, items: [] });
  }

  // 3. Stock safety check
  const existingItem = cart.items.find((item) => item.product.toString() === productId);
  const currentQty = existingItem ? existingItem.quantity : 0;
  const targetQty = currentQty + quantityNum;

  if (product.stock === 0) {
    throw new ApiError(400, 'This product is currently out of stock');
  }

  if (targetQty > product.stock) {
    throw new ApiError(
      400,
      `Cannot add more than available stock. Available: ${product.stock}, you currently have ${currentQty} in cart.`
    );
  }

  // 4. Update or append item
  if (existingItem) {
    existingItem.quantity = targetQty;
  } else {
    cart.items.push({
      product: new Types.ObjectId(productId),
      quantity: targetQty,
    } as any);
  }

  await cart.save();
  const populatedCart = await populateCart(Cart.findById(cart._id));

  res.status(200).json(new ApiResponse(200, serializeCart(populatedCart), 'Item added to cart successfully'));
});

/**
 * Updates a cart item's quantity. Removes the item if set to 0.
 */
export const updateCartItem = asyncHandler(async (req: Request, res: Response) => {
  if (req.user.role !== 'CUSTOMER') {
    throw new ApiError(403, 'Only customers can view or manage shopping carts');
  }

  const { productId, quantity } = req.body;

  if (!productId || !Types.ObjectId.isValid(productId)) {
    throw new ApiError(400, 'A valid product ID is required');
  }

  const quantityNum = Number(quantity);
  if (isNaN(quantityNum) || quantityNum < 0) {
    throw new ApiError(400, 'Quantity must be a non-negative integer');
  }

  let cart = await Cart.findOne({ user: req.user._id });
  if (!cart) {
    throw new ApiError(404, 'Cart not found');
  }

  const itemIndex = cart.items.findIndex((item) => item.product.toString() === productId);
  if (itemIndex === -1) {
    throw new ApiError(404, 'Item not found in your cart');
  }

  // If quantity is set to 0, remove the item
  if (quantityNum === 0) {
    cart.items.splice(itemIndex, 1);
  } else {
    // Validate stock bounds
    const product = await Product.findOne({ _id: productId, isDeleted: false });
    if (!product) {
      throw new ApiError(404, 'Product not found or unavailable');
    }

    if (quantityNum > product.stock) {
      throw new ApiError(
        400,
        `Cannot set quantity higher than available stock. Current stock is ${product.stock}.`
      );
    }

    cart.items[itemIndex].quantity = quantityNum;
  }

  await cart.save();
  const populatedCart = await populateCart(Cart.findById(cart._id));

  res.status(200).json(new ApiResponse(200, serializeCart(populatedCart), 'Cart item updated successfully'));
});

/**
 * Removes a product from the shopping cart.
 */
export const removeFromCart = asyncHandler(async (req: Request, res: Response) => {
  if (req.user.role !== 'CUSTOMER') {
    throw new ApiError(403, 'Only customers can view or manage shopping carts');
  }

  const { productId } = req.params;

  if (!productId || !Types.ObjectId.isValid(productId)) {
    throw new ApiError(400, 'A valid product ID is required');
  }

  let cart = await Cart.findOne({ user: req.user._id });
  if (!cart) {
    throw new ApiError(404, 'Cart not found');
  }

  cart.items = cart.items.filter((item) => item.product.toString() !== productId);

  await cart.save();
  const populatedCart = await populateCart(Cart.findById(cart._id));

  res.status(200).json(new ApiResponse(200, serializeCart(populatedCart), 'Item removed from cart successfully'));
});

/**
 * Clears all items from the customer's cart.
 */
export const clearCart = asyncHandler(async (req: Request, res: Response) => {
  if (req.user.role !== 'CUSTOMER') {
    throw new ApiError(403, 'Only customers can view or manage shopping carts');
  }

  let cart = await Cart.findOne({ user: req.user._id });
  if (!cart) {
    throw new ApiError(404, 'Cart not found');
  }

  cart.items = [];
  await cart.save();

  res.status(200).json(new ApiResponse(200, serializeCart(cart), 'Cart cleared successfully'));
});
