import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { requirePermission } from '../../middleware/requirePermission.js';
import { tenantScope } from '../../middleware/tenantScope.js';
import { validate } from '../../middleware/validate.js';
import { createStaffSchema, updateStaffSchema } from './staff.schemas.js';
import * as ctrl from './staff.controller.js';

const router = Router();
router.use(authenticate);

router.get('/roles', requirePermission('staff:read'), tenantScope, ctrl.roles);
router.get('/', requirePermission('staff:read'), tenantScope, ctrl.list);
router.post('/', requirePermission('staff:manage'), validate(createStaffSchema), tenantScope, ctrl.create);
router.patch('/:id', requirePermission('staff:manage'), validate(updateStaffSchema), tenantScope, ctrl.update);

export default router;