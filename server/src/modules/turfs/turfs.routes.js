import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { requirePermission } from '../../middleware/requirePermission.js';
import { tenantScope } from '../../middleware/tenantScope.js';
import { validate } from '../../middleware/validate.js';
import { uploadImages } from '../../middleware/upload.js';
import { createTurfSchema, updateTurfSchema } from './turfs.schemas.js';
import * as ctrl from './turfs.controller.js';

const router = Router();
router.use(authenticate); 

router.get('/', requirePermission('turf:read'), tenantScope, ctrl.list);
router.get('/:id', requirePermission('turf:read'), tenantScope, ctrl.getOne);

router.post('/', requirePermission('turf:write'), validate(createTurfSchema), tenantScope, ctrl.create);
router.patch('/:id', requirePermission('turf:write'), validate(updateTurfSchema), tenantScope, ctrl.update);
router.delete('/:id', requirePermission('turf:write'), tenantScope, ctrl.archive);


router.post('/:id/images', requirePermission('turf:write'), uploadImages, tenantScope, ctrl.addImages);
router.delete('/:id/images/:imageId', requirePermission('turf:write'), tenantScope, ctrl.removeImage);

export default router;