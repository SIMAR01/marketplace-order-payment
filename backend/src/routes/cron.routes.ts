import { Router } from 'express';
import { triggerPayoutCron } from '../controllers/payment.controller';

const router = Router();

// Automated cron runner endpoint to auto-release held escrow funds
router.post('/release-payouts', triggerPayoutCron);

export default router;
