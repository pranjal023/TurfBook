import { Turf } from '../../models/Turf.js';
import { Booking } from '../../models/Booking.js';
import { User } from '../../models/User.js';
import { Payment } from '../../models/Payment.js';
import { AppError } from '../../utils/AppError.js';
import { runWithTenant } from '../../utils/tenantContext.js';
import { HOLD_MINUTES, MAX_ACTIVE_HOLDS, CANCELLATION_TIERS } from '../../config/booking.js';
import { issueCancellationRefund } from '../payments/payments.service.js';
import { refundFor } from './refundPolicy.js';
import {
  generateSlots, priceFor, lockedUnitsFor, computeAvailability, assertBookableDate,
} from './slotEngine.js';



async function reserve(turf, { unitKey, date, startTime }, { fields, allowStarted = false }) {
  const now = new Date();
  assertBookableDate(date, turf.timezone, now);

  const unit = turf.units.find((u) => u.key === unitKey);
  if (!unit) throw new AppError('Unknown unit', 400, 'UNIT_NOT_FOUND');

  const slot = generateSlots(turf, date).find((s) => s.startTime === startTime);
  if (!slot) throw new AppError('No such slot', 400, 'INVALID_SLOT');


  if ((allowStarted ? slot.endAt : slot.startAt) <= now) {
    throw new AppError('That slot is in the past', 400, 'SLOT_IN_PAST');
  }


  await Booking.updateMany(
    { turfId: turf._id, startAt: slot.startAt, status: 'held', holdExpiresAt: { $lte: now } },
    { $set: { status: 'expired', active: false } }
  );

  try {
    return await Booking.create({
      turfId: turf._id,
      turfName: turf.name,
      unitKey: unit.key,
      lockedUnits: lockedUnitsFor(unit),
      date,
      startTime: slot.startTime,
      endTime: slot.endTime,
      startAt: slot.startAt,
      endAt: slot.endAt,
      amount: priceFor(turf, unit, date, slot.startMinute),
      ...fields,
    });
  } catch (err) {
    
    if (err?.code === 11000) throw new AppError('That slot was just taken', 409, 'SLOT_UNAVAILABLE');
    throw err;
  }
}


export async function createHold(customerId, input) {
  const turf = await Turf.findOne({ _id: input.turfId, status: 'active' }).setOptions({ skipTenant: true });
  if (!turf) throw new AppError('Turf not found', 404, 'TURF_NOT_FOUND');

  const customer = await User.findById(customerId).select('name phone');


  return runWithTenant(turf.tenantId, async () => {
    const activeHolds = await Booking.countDocuments({
      customerId, status: 'held', holdExpiresAt: { $gt: new Date() },
    }).setOptions({ skipTenant: true }); 
    if (activeHolds >= MAX_ACTIVE_HOLDS) {
      throw new AppError('Finish or release your current holds first', 429, 'TOO_MANY_HOLDS');
    }

    return reserve(turf, input, {
      fields: {
        customerId,
        customerName: customer.name,
        customerPhone: customer.phone,
        source: 'online',
        status: 'held',
        holdExpiresAt: new Date(Date.now() + HOLD_MINUTES * 60 * 1000),
      },
    });
  });
}


export async function releaseHold(customerId, bookingId) {
  const booking = await Booking.findOneAndUpdate(
    { _id: bookingId, customerId, status: 'held' },
    { $set: { status: 'cancelled', active: false } }, 
    { new: true }
  ).setOptions({ skipTenant: true });
  if (!booking) throw new AppError('No active hold found', 404, 'HOLD_NOT_FOUND');
  return booking;
}


export async function createWalkIn(staffId, { customerName, customerPhone, ...input }) {
 
  const turf = await Turf.findOne({ _id: input.turfId, status: 'active' });
  if (!turf) throw new AppError('Turf not found', 404, 'TURF_NOT_FOUND');

  return reserve(turf, input, {
    allowStarted: true,
    fields: { createdBy: staffId, customerName, customerPhone, source: 'walk_in', status: 'confirmed' },
  });
}


export async function getAvailability(turfId, date) {
  const turf = await Turf.findOne({ _id: turfId, status: 'active' }).setOptions({ skipTenant: true });
  if (!turf) throw new AppError('Turf not found', 404, 'TURF_NOT_FOUND');

  const now = new Date();
  assertBookableDate(date, turf.timezone, now);

  const slots = generateSlots(turf, date);
  const bookings = await Booking.find({
    turfId: turf._id,
    startAt: { $gte: slots[0].startAt, $lt: slots.at(-1).endAt },
    active: true,
  })
    .select('startAt lockedUnits status holdExpiresAt') 
    .setOptions({ skipTenant: true })
    .lean();

  return {
    turf: { id: turf._id, name: turf.name, slotDurationMinutes: turf.slotDurationMinutes },
    date,
    slots: computeAvailability(turf, date, bookings, now),
  };
}



export async function listBookings({ date, scope, turfId, page, limit }) {
  const now = new Date();

  let filter;
  let sort = { startAt: 1 };

  if (scope === 'upcoming') {
    
    filter = {
      $or: [
        { status: 'confirmed', endAt: { $gt: now } },
        { status: 'held', holdExpiresAt: { $gt: now } },
      ],
    };
  } else if (scope === 'history') {
    
    filter = {
      $or: [
        { status: 'completed' },
        { status: 'confirmed', endAt: { $lte: now } },
        { status: 'cancelled', cancelledByRole: { $exists: true } },
      ],
    };
    sort = { startAt: -1 }; 
  } else {
    filter = {
      date,
      $or: [
        { status: { $in: ['confirmed', 'completed'] } },
        { status: 'cancelled', cancelledByRole: { $exists: true } },
        { status: 'held', holdExpiresAt: { $gt: now } },
      ],
    };
  }
  if (turfId) filter.turfId = turfId;

  const paged = Boolean(scope);
  const query = Booking.find(filter).sort(sort);
  if (paged) query.skip((page - 1) * limit).limit(limit);
  const [rows, total] = await Promise.all([query.lean(), paged ? Booking.countDocuments(filter) : null]);

  const bookings = rows.map((b) => ({
    ...b,
    
    canCancel: (b.status === 'confirmed' && b.endAt > now) || (b.status === 'held' && b.holdExpiresAt > now),
    
    status: b.status === 'confirmed' && b.endAt <= now ? 'completed' : b.status,
  }));

  return paged ? { bookings, page, limit, total, totalPages: Math.ceil(total / limit) } : { bookings };
}


export async function myBookings(customerId, { scope, page, limit }) {
  const now = new Date();

  const filter = {
    customerId,
    ...(scope === 'upcoming'
      ? {
          $or: [
            { status: 'confirmed', endAt: { $gt: now } },        
            { status: 'held', holdExpiresAt: { $gt: now } },    
          ],
        }
      : {
          $or: [
            { status: 'completed' },
            { status: 'confirmed', endAt: { $lte: now } },
            { status: 'cancelled', cancelledByRole: { $exists: true } }, 
          ],
        }),
  };

  const [rows, total] = await Promise.all([
    Booking.find(filter)
      .select('turfId turfName unitKey date startTime endTime startAt endAt amount status holdExpiresAt cancelledByRole cancelReason refundAmount')
      .sort(scope === 'upcoming' ? { startAt: 1 } : { startAt: -1 }) 
      .skip((page - 1) * limit)
      .limit(limit)
      .setOptions({ skipTenant: true })
      .lean(),
    Booking.countDocuments(filter).setOptions({ skipTenant: true }),
  ]);

  
  const refunded = rows.filter((b) => b.refundAmount > 0).map((b) => b._id);
  const payments = refunded.length
    ? await Payment.find({ bookingId: { $in: refunded } }).select('bookingId refund.status').setOptions({ skipTenant: true }).lean()
    : [];
  const refundStatus = new Map(payments.map((p) => [String(p.bookingId), p.refund?.status ?? 'requested']));

  const bookings = rows.map((b) => {
    const live = b.status === 'held' && b.holdExpiresAt > now;
    const played = b.status === 'completed' || (b.status === 'confirmed' && b.endAt <= now);
    return {
      ...b,
      status: played ? 'completed' : b.status === 'held' && !live ? 'expired' : b.status,
      secondsLeft: live ? Math.ceil((b.holdExpiresAt - now) / 1000) : undefined,
      canCancel: b.status === 'confirmed' && b.startAt > now,
      inProgress: b.status === 'confirmed' && b.startAt <= now && b.endAt > now,
      refundStatus: refundStatus.get(String(b._id)),
    };
  });

  return { bookings, page, limit, total, totalPages: Math.ceil(total / limit) };
}



async function loadCancellable(customerId, bookingId, now) {
  const booking = await Booking.findOne({ _id: bookingId, customerId }).setOptions({ skipTenant: true });
  if (!booking) throw new AppError('Booking not found', 404, 'BOOKING_NOT_FOUND');
  if (booking.status !== 'confirmed') {
    throw new AppError(`A ${booking.status} booking cannot be cancelled`, 409, 'NOT_CANCELLABLE');
  }
  if (booking.startAt <= now) throw new AppError('This slot has already started', 409, 'TOO_LATE');
  return booking;
}


export async function previewCancellation(customerId, bookingId) {
  const now = new Date();
  const booking = await loadCancellable(customerId, bookingId, now);
  const refund = refundFor(booking.amount, booking.startAt, now);
  return {
    amount: booking.amount,
    refundPercent: refund.percent,
    refundAmount: refund.amount,
    hoursLeft: Math.floor(refund.hoursLeft),
    tiers: CANCELLATION_TIERS,
  };
}


export async function cancelByCustomer(customerId, bookingId) {
  const now = new Date();
  const booking = await loadCancellable(customerId, bookingId, now);
  const refund = refundFor(booking.amount, booking.startAt, now);


  const cancelled = await Booking.findOneAndUpdate(
    { _id: booking._id, status: 'confirmed', startAt: { $gt: now } },
    {
      $set: {
        status: 'cancelled', active: false, 
        cancelledAt: now, cancelledBy: customerId, cancelledByRole: 'customer',
        refundAmount: refund.amount, refundPending: refund.amount > 0,
      },
    },
    { new: true }
  ).setOptions({ skipTenant: true });
  if (!cancelled) throw new AppError('This booking just changed. Refresh and try again.', 409, 'CONFLICT');

  if (refund.amount > 0) await issueCancellationRefund(cancelled);
  return { refund: { percent: refund.percent, amount: refund.amount } };
}


export async function cancelByStaff(staffId, bookingId, reason) {
  const now = new Date();
  const booking = await Booking.findById(bookingId);
  if (!booking) throw new AppError('Booking not found', 404, 'BOOKING_NOT_FOUND');
  if (!['confirmed', 'held'].includes(booking.status)) {
    throw new AppError(`A ${booking.status} booking cannot be cancelled`, 409, 'NOT_CANCELLABLE');
  }
  if (booking.status === 'confirmed' && booking.endAt <= now) {
    throw new AppError('This booking is already over', 409, 'ALREADY_OVER');
  }

  
  const paid = booking.status === 'confirmed' && booking.source === 'online';
  const refundAmount = paid ? booking.amount : 0;

  const cancelled = await Booking.findOneAndUpdate(
    { _id: booking._id, status: booking.status }, 
    {
      $set: {
        status: 'cancelled', active: false,
        cancelledAt: now, cancelledBy: staffId, cancelledByRole: 'staff', cancelReason: reason,
        refundAmount, refundPending: refundAmount > 0,
      },
    },
    { new: true }
  );
  if (!cancelled) throw new AppError('This booking just changed. Refresh and try again.', 409, 'CONFLICT');

  if (refundAmount > 0) await issueCancellationRefund(cancelled);
  return { refund: { percent: paid ? 100 : 0, amount: refundAmount } };
}