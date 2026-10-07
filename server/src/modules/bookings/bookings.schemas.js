import { z } from 'zod';
import { TIME_RE } from '../../utils/time.js';
import { DATE_RE } from './slotEngine.js';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
const date = z.string().regex(DATE_RE, 'Use YYYY-MM-DD');

export const holdSchema = z.object({
  turfId: objectId,
  unitKey: z.string().trim().toLowerCase().min(1),
  date,
  startTime: z.string().regex(TIME_RE, 'Use HH:mm'),
});

export const walkInSchema = holdSchema.extend({
  customerName: z.string().trim().min(2).max(80),
  customerPhone: z.string().regex(/^[6-9]\d{9}$/, 'Invalid phone number').optional(),
});

export const cancelStaffSchema = z.object({
  reason: z.string().trim().min(3, 'Give a short reason').max(200),
});

export const dateQuerySchema = z.object({ date });


export const listQuerySchema = z
  .object({
    date: date.optional(),
    scope: z.enum(['upcoming', 'history']).optional(),
    turfId: objectId.optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  })
  .refine((q) => q.date || q.scope, { message: 'Provide a date or a scope', path: ['date'] });


export const mineQuerySchema = z.object({
  scope: z.enum(['upcoming', 'history']).default('upcoming'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});