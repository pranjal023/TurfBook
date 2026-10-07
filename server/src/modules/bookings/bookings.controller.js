import * as svc from './bookings.service.js';
import { dateQuerySchema, listQuerySchema, mineQuerySchema } from './bookings.schemas.js';

const ok = (res, data, status = 200) => res.status(status).json({ success: true, data });

export async function availability(req, res) {
  const { date } = dateQuerySchema.parse(req.query);
  ok(res, await svc.getAvailability(req.params.id, date));
}

export async function createHold(req, res) {
  const booking = await svc.createHold(req.user.id, req.body);
  const secondsLeft = Math.max(0, Math.ceil((booking.holdExpiresAt - Date.now()) / 1000));
  ok(res, { booking, secondsLeft }, 201);
}

export async function release(req, res) {
  await svc.releaseHold(req.user.id, req.params.id);
  ok(res, {});
}

export async function mine(req, res) {
  ok(res, await svc.myBookings(req.user.id, mineQuerySchema.parse(req.query)));
}

export async function cancellationPreview(req, res) {
  ok(res, await svc.previewCancellation(req.user.id, req.params.id));
}

export async function cancelMine(req, res) {
  ok(res, await svc.cancelByCustomer(req.user.id, req.params.id));
}

export async function listForStaff(req, res) {
  ok(res, await svc.listBookings(listQuerySchema.parse(req.query)));
}

export async function createWalkIn(req, res) {
  ok(res, { booking: await svc.createWalkIn(req.user.id, req.body) }, 201);
}

export async function cancelStaff(req, res) {
  ok(res, await svc.cancelByStaff(req.user.id, req.params.id, req.body.reason));
}