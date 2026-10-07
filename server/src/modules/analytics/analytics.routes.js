import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { requirePermission } from '../../middleware/requirePermission.js';
import { tenantScope } from '../../middleware/tenantScope.js';
import { overview } from './analytics.controller.js';

const router = Router();
router.use(authenticate);
router.get('/', requirePermission('analytics:view'), tenantScope, overview);

export default router;