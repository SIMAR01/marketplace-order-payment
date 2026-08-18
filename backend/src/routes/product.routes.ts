import { Router } from 'express';
import { verifyJWT } from '../middleware/auth.middleware';
import { authorizeRoles } from '../middleware/role.middleware';
import { upload } from '../middleware/multer.middleware';
import { validate } from '../middleware/validate.middleware';
import { createProductSchema, updateProductSchema } from '../validators/product.schema';
import {
  createProduct,
  getProviderProducts,
  getProviderProductById,
  updateProduct,
  deleteProduct,
  getProducts,
  getProductById,
} from '../controllers/product.controller';

const router = Router();

// Middleware chain helper for provider/admin authentication
const requireProviderAuth = [verifyJWT, authorizeRoles('PROVIDER', 'ADMIN')];

// 1. Base endpoints
router
  .route('/')
  .get(getProducts) // Public Search (unprotected)
  .post(requireProviderAuth, upload.array('images', 5), validate(createProductSchema), createProduct); // Protected create

// 2. Provider Inventory endpoint
router
  .route('/inventory')
  .get(requireProviderAuth, getProviderProducts); // Protected list

// 3. ID specific endpoints
router
  .route('/:id')
  .get(getProductById) // Public PDP Details (unprotected)
  .patch(requireProviderAuth, upload.array('images', 5), validate(updateProductSchema), updateProduct) // Protected edit
  .delete(requireProviderAuth, deleteProduct); // Protected delete

export default router;
