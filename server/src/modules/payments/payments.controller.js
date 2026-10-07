import { z } from 'zod';
import { verifyWebhookSignature } from '../../integrations/cashfree.js';
import { AppError } from '../../utils/AppError.js';
import * as svc from './payments.service.js';

const ok = (res, data, status = 200) => res.status(status).json({ success: true, data });

export async function checkout(req, res) {
  const { bookingId } = z.object({ bookingId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id') }).parse(req.body);
  ok(res, await svc.createCheckout(req.user.id, bookingId));
}

export async function verify(req, res) {
  ok(res, await svc.verifyBookingPayment(req.user.id, req.params.bookingId));
}


export async function cashfreeWebhook(req, res) {
  if (!Buffer.isBuffer(req.body)) throw new AppError('Bad request', 400, 'BAD_REQUEST');
  const raw = req.body.toString('utf8');

  const valid = verifyWebhookSignature(raw, req.get('x-webhook-signature'), req.get('x-webhook-timestamp'));
  if (!valid) throw new AppError('Invalid signature', 401, 'BAD_SIGNATURE');

  let event;
  try { event = JSON.parse(raw); } catch { throw new AppError('Invalid JSON', 400, 'BAD_REQUEST'); }

  
  await svc.handleWebhookEvent(event);
  res.json({ received: true });
}