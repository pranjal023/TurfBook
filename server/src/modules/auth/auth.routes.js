import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { authenticate } from '../../middleware/authenticate.js';
import { registerCustomerSchema, registerTenantSchema, loginSchema } from './auth.schemas.js';
import * as ctrl from './auth.controller.js';

const router = Router();

router.post('/register', validate(registerCustomerSchema), ctrl.registerCustomer);
router.post('/register-tenant', validate(registerTenantSchema), ctrl.registerTenant);
router.post('/login', validate(loginSchema), ctrl.login);
router.post('/refresh', ctrl.refresh);
router.post('/logout', ctrl.logout);
router.get('/me', authenticate, ctrl.me);

export default router;