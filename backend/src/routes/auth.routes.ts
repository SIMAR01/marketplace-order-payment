import { Router } from 'express';
import {
  register,
  login,
  refreshAccessToken,
  logout,
  getCurrentUser
} from '../controllers/auth.controller';
import { validate } from '../middleware/validate.middleware';
import { verifyJWT } from '../middleware/auth.middleware';
import { registerSchema, loginSchema } from '../validators/auth.schema';

const router = Router();

// Public routes
router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.post('/refresh', refreshAccessToken);

// Protected routes (require valid access token)
router.post('/logout', verifyJWT, logout);

// Current user profile
router.get('/profile', verifyJWT, getCurrentUser);

export default router;
