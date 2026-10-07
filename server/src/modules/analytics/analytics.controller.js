import { z } from 'zod';
import { getAnalytics } from './analytics.service.js';

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD');
const querySchema = z.object({
  from: date.optional(),
  to: date.optional(),
  turfId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id').optional(),
});

export async function overview(req, res) {
  res.json({ success: true, data: await getAnalytics(querySchema.parse(req.query)) });
}