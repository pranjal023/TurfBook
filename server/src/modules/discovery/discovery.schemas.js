import { z } from 'zod';
import { SPORTS, FACILITIES } from '../../config/catalog.js';

const csv = z.string().transform((s) => s.split(',').map((x) => x.trim()).filter(Boolean));

export const searchSchema = z
  .object({
    q: z.string().trim().max(60).optional(),
    city: z.string().trim().max(60).optional(),
    sport: z.enum(SPORTS).optional(),
    facilities: csv.pipe(z.array(z.enum(FACILITIES)).max(10)).optional(), 
    minPrice: z.coerce.number().int().min(0).optional(),                 
    maxPrice: z.coerce.number().int().min(0).optional(),
    lat: z.coerce.number().min(-90).max(90).optional(),
    lng: z.coerce.number().min(-180).max(180).optional(),
    radiusKm: z.coerce.number().min(1).max(100).default(10),
    sort: z.enum(['newest', 'price_asc', 'price_desc']).default('newest'),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(24).default(12),
  })
  .refine((d) => (d.lat === undefined) === (d.lng === undefined), {
    message: 'Send both lat and lng, or neither',
    path: ['lat'],
  })
  .refine((d) => d.minPrice === undefined || d.maxPrice === undefined || d.minPrice <= d.maxPrice, {
    message: 'minPrice cannot exceed maxPrice',
    path: ['minPrice'],
  });