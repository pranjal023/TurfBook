import { Router } from 'express';
import { ROLES } from '../../config/permissions.js';
import { authenticate } from '../../middleware/authenticate.js';
import { requireRole } from '../../middleware/requireRole.js';
import { requirePermission } from '../../middleware/requirePermission.js';
import { tenantScope } from '../../middleware/tenantScope.js';
import { validate } from '../../middleware/validate.js';
import { holdSchema, walkInSchema, cancelStaffSchema } from './bookings.schemas.js';
import * as ctrl from './bookings.controller.js';

export const publicRouter = Router();
publicRouter.get('/turfs/:id/availability', ctrl.availability);


export const customerRouter = Router();
customerRouter.use(authenticate, requireRole(ROLES.CUSTOMER));
customerRouter.post('/', validate(holdSchema), ctrl.createHold);
customerRouter.get('/mine', ctrl.mine);
customerRouter.get('/:id/cancellation', ctrl.cancellationPreview);
customerRouter.post('/:id/cancel', ctrl.cancelMine);
customerRouter.delete('/:id', ctrl.release);


export const staffRouter = Router();
staffRouter.use(authenticate);
staffRouter.get('/', requirePermission('booking:read'), tenantScope, ctrl.listForStaff);
staffRouter.post('/', requirePermission('booking:create'), validate(walkInSchema), tenantScope, ctrl.createWalkIn);
staffRouter.post('/:id/cancel', requirePermission('booking:cancel'), validate(cancelStaffSchema), tenantScope, ctrl.cancelStaff);