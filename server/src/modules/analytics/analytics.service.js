import mongoose from 'mongoose';
import { DateTime } from 'luxon';
import { Booking } from '../../models/Booking.js';
import { AppError } from '../../utils/AppError.js';

const ZONE = 'Asia/Kolkata';
const PAID = ['confirmed', 'completed'];
const isPaid = { $in: ['$status', PAID] };
const countIf = (cond) => ({ $sum: { $cond: [cond, 1, 0] } });
const sumIf = (cond) => ({ $sum: { $cond: [cond, '$amount', 0] } });
const paidOnly = { $match: { status: { $in: PAID } } };

export async function getAnalytics({ from, to, turfId }) {
  const end = to ? DateTime.fromISO(to, { zone: ZONE }) : DateTime.now().setZone(ZONE).startOf('day');
  const start = from ? DateTime.fromISO(from, { zone: ZONE }) : end.minus({ days: 29 });
  if (!start.isValid || !end.isValid || start > end) throw new AppError('Invalid date range', 400, 'INVALID_RANGE');
  const days = Math.round(end.diff(start, 'days').days) + 1;
  if (days > 366) throw new AppError('Choose a range of up to one year', 400, 'RANGE_TOO_LARGE');

 
  const [facets] = await Booking.aggregate([
    {
      $match: {
        date: { $gte: start.toISODate(), $lte: end.toISODate() }, 
        ...(turfId && { turfId: new mongoose.Types.ObjectId(turfId) }), 
        $or: [
          { status: { $in: PAID } },
          { status: 'cancelled', cancelledByRole: { $exists: true } }, 
        ],
      },
    },
    {
      $facet: {
        totals: [
          {
            $group: {
              _id: null,
              bookings: countIf(isPaid),
              revenue: sumIf(isPaid),
              cancelled: countIf({ $eq: ['$status', 'cancelled'] }),
              online: countIf({ $and: [isPaid, { $eq: ['$source', 'online'] }] }),
              walkIn: countIf({ $and: [isPaid, { $eq: ['$source', 'walk_in'] }] }),
            },
          },
        ],
        byDay: [paidOnly, { $group: { _id: '$date', revenue: { $sum: '$amount' }, bookings: { $sum: 1 } } }],
        byHour: [
          paidOnly,
          { $group: { _id: { $substrBytes: ['$startTime', 0, 2] }, bookings: { $sum: 1 } } }, // "18:30" -> "18"
        ],
        byTurf: [
          paidOnly,
          { $group: { _id: '$turfId', name: { $first: '$turfName' }, revenue: { $sum: '$amount' }, bookings: { $sum: 1 } } },
          { $sort: { revenue: -1 } },
          { $limit: 10 },
        ],
      },
    },
  ]);

  const t = facets.totals[0] ?? { bookings: 0, revenue: 0, cancelled: 0, online: 0, walkIn: 0 };
  const attempts = t.bookings + t.cancelled;

  
  const dayMap = new Map(facets.byDay.map((d) => [d._id, d]));
  const daily = Array.from({ length: days }, (_, i) => {
    const date = start.plus({ days: i }).toISODate();
    return { date, revenue: dayMap.get(date)?.revenue ?? 0, bookings: dayMap.get(date)?.bookings ?? 0 };
  });

  return {
    range: { from: start.toISODate(), to: end.toISODate(), days },
    totals: {
      revenue: t.revenue,
      bookings: t.bookings,
      cancelled: t.cancelled,
      online: t.online,
      walkIn: t.walkIn,
      avgBookingValue: t.bookings ? Math.round(t.revenue / t.bookings) : 0,
      cancellationRate: attempts ? Math.round((t.cancelled / attempts) * 1000) / 10 : 0, 
    },
    daily,
    hourly: facets.byHour.map((h) => ({ hour: Number(h._id), bookings: h.bookings })).sort((a, b) => a.hour - b.hour),
    turfs: facets.byTurf.map((x) => ({ turfId: x._id, name: x.name, revenue: x.revenue, bookings: x.bookings })),
  };
}