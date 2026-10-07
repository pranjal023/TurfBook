import { CANCELLATION_TIERS } from '../../config/booking.js';

// Pure function: how much does a customer get back if they cancel NOW?
export function refundFor(amountPaise, startAt, now = new Date()) {
  const hoursLeft = (startAt.getTime() - now.getTime()) / 3_600_000;
  const tier = CANCELLATION_TIERS.find((t) => hoursLeft >= t.minHours);
  const percent = tier?.percent ?? 0; 
  
  return { percent, amount: Math.floor((amountPaise * percent) / 100), hoursLeft };
}