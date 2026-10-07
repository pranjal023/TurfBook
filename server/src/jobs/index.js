import cron from 'node-cron';
import { Booking } from '../models/Booking.js';
import { Payment } from '../models/Payment.js';
import { syncPayment, sendRefund, issueCancellationRefund } from '../modules/payments/payments.service.js';

const skip = { skipTenant: true };


export async function expireStaleHolds() {
  const res = await Booking.updateMany(
    { status: 'held', holdExpiresAt: { $lte: new Date() } },
    { $set: { status: 'expired', active: false } }
  ).setOptions(skip);
  return res.modifiedCount;
}


export async function reconcilePayments() {
  const now = Date.now();

  
  const open = await Payment.find({
    status: 'created',
    createdAt: { $gt: new Date(now - 2 * 3600_000), $lt: new Date(now - 30_000) },
  }).limit(50).setOptions(skip);
  for (const p of open) {
    try { await syncPayment(p.orderId); } catch (err) { console.error(`sync ${p.orderId} failed:`, err.message); }
  }

  
  const refunds = await Payment.find({
    'refund.status': { $in: ['requested', 'pending'] },
    updatedAt: { $lt: new Date(now - 120_000) },
  }).limit(50).setOptions(skip);
  for (const p of refunds) await sendRefund(p, { checkFirst: true });

  
  const orphaned = await Booking.find({
    refundPending: true,
    cancelledAt: { $lt: new Date(now - 60_000) },
  }).limit(50).setOptions(skip);
  for (const b of orphaned) {
    try { await issueCancellationRefund(b); } catch (err) { console.error(`cancel-refund ${b._id} failed:`, err.message); }
  }

  return { synced: open.length, refundsChecked: refunds.length, orphaned: orphaned.length };
}

export function startJobs() {
  cron.schedule('* * * * *', async () => {
    try {
      const n = await expireStaleHolds();
      if (n) console.log(`Expired ${n} stale hold(s)`);
      await reconcilePayments();
    } catch (err) {
      console.error('background job failed:', err);
    }
  });
}