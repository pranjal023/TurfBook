import { z } from 'zod';

const email = z.string().trim().toLowerCase().pipe(z.email());

const password = z.string().min(8, 'Min 8 characters').max(72);
const phone = z.string().regex(/^[6-9]\d{9}$/, 'Invalid phone number').optional();

export const registerCustomerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email,
  password,
  phone,
});

export const registerTenantSchema = registerCustomerSchema.extend({
  businessName: z.string().trim().min(2).max(100),
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1),
});