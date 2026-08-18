import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { Cart } from '../models/Cart';
import { Product } from '../models/Product';
import { ApiError } from '../utils/ApiError';
import { ApiResponse } from '../utils/ApiResponse';
import { asyncHandler } from '../utils/asyncHandler';

/**
 * Helper to dynamically recalculate cart subtotals and check real-time stock warnings.
 * Divides cents integers by 100 on response serialization for standard decimal output.
 */
const serializeCart = (cart: any) => {
  let subtotalCents = 0;
  const items = cart.items
    .map((item: any) => {
      const product = item.product;
      // Gracefully filter out or ignore soft-deleted / missing products
      if (!product || product.isDeleted) {
        return null;
      }

      const priceCents = product.price.amount;
      const itemSubtotalCents = item.quantity * priceCents;
      subtotalCents += itemSubtotalCents;

      // Real-time stock status assessments
      const isOutOfStock = product.stock === 0;
      const hasInsufficientStock = item.quantity > product.stock;

      return {
        product: {
          _id: product._id,
          title: product.title,
          description: product.description,
          price: {
            amount: priceCents / 100, // Return standard decimal format
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
      };
    })
    .filter(Boolean);

  // Dynamic pricing calculations (Flat $5.00 shipping fee and 8% tax)
  const shippingFeeCents = subtotalCents > 0 ? 500 : 0;
  const taxRate = 0.08;
  const taxCents = Math.round(subtotalCents * taxRate);
  const totalAmountCents = subtotalCents + shippingFeeCents + taxCents;

  return {
    _id: cart._id,
    user: cart.user,
    items,
    totals: {
      subtotal: subtotalCents / 100,
      shippingFee: shippingFeeCents / 100,
      tax: taxCents / 100,
      totalAmount: totalAmountCents / 100,
    },
    hasWarnings: items.some((item: any) => item.isOutOfStock || item.hasInsufficientStock),
  };
};

/**
 * Retrieves the authenticated customer's active cart.
 * Automatically creates an empty cart if none is found.
 */
export const getCart = asyncHandler(async (req: Request, res: Response) => {
  if (req.user.role !== 'CUSTOMER') {
    throw new ApiError(403, 'Only customers can view or manage shopping carts');
  }

  let cart = await Cart.findOne({ user: req.user._id }).populate('items.product');

  if (!cart) {
    cart = await Cart.create({ user: req.user._id, items: [] });
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
  const populatedCart = await cart.populate('items.product');

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
  const populatedCart = await cart.populate('items.product');

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
  const populatedCart = await cart.populate('items.product');

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
