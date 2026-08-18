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
} from '../controllers/product.controller';

const router = Router();

// Secure all product routes to only logged-in Providers or Admins
router.use(verifyJWT, authorizeRoles('PROVIDER', 'ADMIN'));

router
  .route('/')
  .get(getProviderProducts)
  .post(upload.array('images', 5), validate(createProductSchema), createProduct);

router
  .route('/:id')
  .get(getProviderProductById)
  .patch(upload.array('images', 5), validate(updateProductSchema), updateProduct)
  .delete(deleteProduct);

export default router;
