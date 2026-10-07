import { z } from 'zod';

const email = z.string().trim().toLowerCase().pipe(z.email());
const password = z.string().min(8, 'Min 8 characters').max(72); 
const phone = z.string().regex(/^[6-9]\d{9}$/, 'Invalid phone number');

const staffRole = z.enum(['manager', 'receptionist', 'ground_staff']);

export const createStaffSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email,
  phone: phone.optional(),
  role: staffRole,
  password,
});

export const updateStaffSchema = z
  .object({
    name: z.string().trim().min(2).max(80).optional(),
    phone: phone.optional(),
    role: staffRole.optional(),
    isActive: z.boolean().optional(),
    password: password.optional(), 
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'Nothing to update' });