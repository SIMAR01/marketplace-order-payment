import { Router } from 'express';
import { verifyJWT } from '../middleware/auth.middleware';
import { authorizeRoles } from '../middleware/role.middleware';
import {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
} from '../controllers/cart.controller';

const router = Router();

// Gated to logged-in users with CUSTOMER role
router.use(verifyJWT, authorizeRoles('CUSTOMER'));

router
  .route('/')
  .get(getCart) // Retrieve populated cart
  .post(addToCart) // Add/Increment item
  .delete(clearCart); // Empty cart

router.route('/item').patch(updateCartItem); // Update quantity (or remove if 0)

router.route('/item/:productId').delete(removeFromCart); // Remove single product

export default router;
