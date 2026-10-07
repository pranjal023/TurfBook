import { z } from 'zod';
import { SPORTS, FACILITIES } from '../../config/catalog.js';
import { TIME_RE, toMinutes } from '../../utils/time.js';

const time = z.string().regex(TIME_RE, 'Use HH:mm (24h)');

const unitSchema = z.object({
  key: z.string().trim().toLowerCase().regex(/^[a-z0-9-]{1,30}$/, 'Lowercase letters, digits and dashes only'),
  name: z.string().trim().min(1).max(60),
  basePrice: z.number().int().min(0), 
  blocks: z.array(z.string()).optional(),
});

const turfShape = z.object({
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(1000).optional(),
  address: z.object({
    line1: z.string().trim().min(3).max(150),
    area: z.string().trim().max(80).optional(),
    city: z.string().trim().min(2).max(60),
    state: z.string().trim().min(2).max(60),
    pincode: z.string().regex(/^\d{6}$/, 'Invalid pincode'),
  }),
  location: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  }),
  sports: z.array(z.enum(SPORTS)).min(1),
  pricing: z.object({
  weekendSurchargePercent: z.number().int().min(0).max(300).optional(),
  peakRules: z.array(z.object({
    startTime: time,
    endTime: time,
    surchargePercent: z.number().int().min(0).max(300),
  })).max(5).optional(),
}).optional(),
  facilities: z.array(z.enum(FACILITIES)).optional(),
  units: z.array(unitSchema).min(1),
  openTime: time,
  closeTime: time,
  slotDurationMinutes: z.number().refine((v) => [30, 60, 90, 120].includes(v), 'Must be 30, 60, 90 or 120'),
});


function hoursAreValid(d) {
  if (!d.openTime || !d.closeTime) return true;
  const span = toMinutes(d.closeTime) - toMinutes(d.openTime);
  if (span <= 0) return false;
  return !d.slotDurationMinutes || span % d.slotDurationMinutes === 0;
}
const hoursError = { message: 'closeTime must be after openTime and fit a whole number of slots', path: ['closeTime'] };

export const createTurfSchema = turfShape.refine(hoursAreValid, hoursError);

export const updateTurfSchema = turfShape
  .partial()
  .extend({ status: z.enum(['active', 'inactive']).optional() })
  .refine(hoursAreValid, hoursError)
  .refine((d) => Object.keys(d).length > 0, { message: 'Nothing to update' });