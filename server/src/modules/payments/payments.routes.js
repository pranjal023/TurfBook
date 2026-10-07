import { Router } from 'express';
import { ROLES } from '../../config/permissions.js';
import { authenticate } from '../../middleware/authenticate.js';
import { requireRole } from '../../middleware/requireRole.js';
import * as ctrl from './payments.controller.js';

const router = Router();
router.use(authenticate, requireRole(ROLES.CUSTOMER));
router.post('/checkout', ctrl.checkout);
router.post('/bookings/:bookingId/verify', ctrl.verify);

export default router;