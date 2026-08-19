import { Router } from 'express';
import { verifyJWT } from '../middleware/auth.middleware';
import { authorizeRoles } from '../middleware/role.middleware';
import {
  createConnectAccountLink,
  getStripeAccountStatus,
  createDashboardLoginLink,
} from '../controllers/providerStripe.controller';

const router = Router();

// Gated strictly to Providers and Admins
router.use(verifyJWT, authorizeRoles('PROVIDER', 'ADMIN'));

router.post('/onboarding-link', createConnectAccountLink);
router.get('/status', getStripeAccountStatus);
router.post('/login-link', createDashboardLoginLink);

export default router;
