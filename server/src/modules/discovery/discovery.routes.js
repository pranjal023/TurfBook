import { Router } from 'express';
import * as ctrl from './discovery.controller.js';

const router = Router();
router.get('/meta', ctrl.meta);
router.get('/turfs', ctrl.search);
router.get('/turfs/:id', ctrl.detail);

export default router;