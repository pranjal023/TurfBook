import { DateTime } from 'luxon';
import { toMinutes } from '../../utils/time.js';
import { AppError } from '../../utils/AppError.js';
import { MAX_ADVANCE_DAYS } from '../../config/booking.js';

export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const fmt = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;


export function localToUtc(date, minutes, zone) {
  const midnight = DateTime.fromISO(date, { zone });
  if (!DATE_RE.test(date) || !midnight.isValid) throw new AppError('Invalid date', 400, 'INVALID_DATE');
  const t = minutes >= 1440
    ? midnight.plus({ days: 1 })
    : midnight.set({ hour: Math.floor(minutes / 60), minute: minutes % 60 });
  return t.toUTC().toJSDate();
}

export function assertBookableDate(date, zone, now = new Date()) {
  const d = DateTime.fromISO(date, { zone });
  if (!DATE_RE.test(date) || !d.isValid) throw new AppError('Invalid date', 400, 'INVALID_DATE');
  const today = DateTime.fromJSDate(now, { zone }).startOf('day');
  if (d < today) throw new AppError('That date is in the past', 400, 'INVALID_DATE');
  if (d > today.plus({ days: MAX_ADVANCE_DAYS })) {
    throw new AppError(`Bookings open ${MAX_ADVANCE_DAYS} days ahead`, 400, 'DATE_TOO_FAR');
  }
}


export function generateSlots(turf, date) {
  const open = toMinutes(turf.openTime);
  const close = toMinutes(turf.closeTime);
  const step = turf.slotDurationMinutes;
  const slots = [];
  for (let m = open; m + step <= close; m += step) {
    slots.push({
      startMinute: m,
      startTime: fmt(m),
      endTime: fmt(m + step),
      startAt: localToUtc(date, m, turf.timezone),
      endAt: localToUtc(date, m + step, turf.timezone),
    });
  }
  return slots;
}


export function priceFor(turf, unit, date, startMinute) {
  const day = DateTime.fromISO(date, { zone: turf.timezone });
  const weekend = day.weekday >= 6 ? turf.pricing?.weekendSurchargePercent ?? 0 : 0;
  const peak = Math.max(
    0,
    ...(turf.pricing?.peakRules ?? [])
      .filter((r) => startMinute >= toMinutes(r.startTime) && startMinute < toMinutes(r.endTime))
      .map((r) => r.surchargePercent)
  );
  return Math.round((unit.basePrice * (100 + weekend + peak)) / 100);
}


export const lockedUnitsFor = (unit) => [unit.key, ...unit.blocks];


const isLive = (b, now) => b.status === 'confirmed' || (b.status === 'held' && b.holdExpiresAt > now);

export function computeAvailability(turf, date, bookings, now = new Date()) {
  const live = bookings.filter((b) => isLive(b, now));

  return generateSlots(turf, date).map((slot) => {
    const occupied = new Set();
    for (const b of live) {
      if (b.startAt.getTime() === slot.startAt.getTime()) b.lockedUnits.forEach((k) => occupied.add(k));
    }
    const isPast = slot.startAt <= now;

    return {
      startTime: slot.startTime,
      endTime: slot.endTime,
      startAt: slot.startAt.toISOString(),
      units: turf.units.map((unit) => ({
        key: unit.key,
        name: unit.name,
        price: priceFor(turf, unit, date, slot.startMinute),
        
        available: !isPast && lockedUnitsFor(unit).every((k) => !occupied.has(k)),
      })),
    };
  });
}