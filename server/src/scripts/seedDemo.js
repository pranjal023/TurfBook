import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { User } from '../models/User.js';
import { Turf } from '../models/Turf.js';
import { Booking } from '../models/Booking.js';
import { generateSlots, priceFor, lockedUnitsFor } from '../modules/bookings/slotEngine.js';
import { DateTime } from 'luxon';

const email = process.argv[2];
if (!email) {
  console.error('Usage: node src/scripts/seedDemo.js <owner-email>');
  process.exit(1);
}

const NAMES = ['Rahul', 'Aman', 'Priya', 'Vikram', 'Sneha', 'Arjun', 'Neha', 'Karan', 'Pooja', 'Rohit', 'Isha', 'Dev'];
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

await connectDB();
const owner = await User.findOne({ email: email.toLowerCase() });
if (!owner?.tenantId) {
  console.error('No business owner found with that email');
  process.exit(1);
}
const turfs = await Turf.find({ tenantId: owner.tenantId, status: 'active' }).setOptions({ skipTenant: true });
if (!turfs.length) {
  console.error('That business has no active turfs. Create one first.');
  process.exit(1);
}

const docs = [];
const today = DateTime.now().setZone('Asia/Kolkata').startOf('day');

for (const turf of turfs) {
  for (let back = 60; back >= 1; back--) {
    const day = today.minus({ days: back });
    const date = day.toISODate();
    const weekend = day.weekday >= 6;

    for (const slot of generateSlots(turf, date)) {
      const hour = Math.floor(slot.startMinute / 60);
      const chance = Math.min(0.85, 0.2 + (hour >= 18 && hour < 22 ? 0.35 : 0) + (weekend ? 0.15 : 0));
      if (Math.random() > chance) continue;

      const unit = pick(turf.units);
      const status = Math.random() < 0.88 ? 'completed' : 'cancelled';
      const walkIn = Math.random() < 0.35;
      docs.push({
        tenantId: owner.tenantId,
        turfId: turf._id,
        turfName: turf.name,
        unitKey: unit.key,
        lockedUnits: lockedUnitsFor(unit),
        customerName: pick(NAMES),
        source: walkIn ? 'walk_in' : 'online',
        ...(walkIn && { createdBy: owner._id }),
        date,
        startTime: slot.startTime,
        endTime: slot.endTime,
        startAt: slot.startAt,
        endAt: slot.endAt,
        amount: priceFor(turf, unit, date, slot.startMinute),
        status, 
        ...(status === 'cancelled' && { cancelledAt: new Date(slot.startAt.getTime() - 86_400_000), cancelledByRole: 'customer' }),
      });
    }
  }
}

for (let i = 0; i < docs.length; i += 500) await Booking.insertMany(docs.slice(i, i + 500));
console.log(`Inserted ${docs.length} bookings across ${turfs.length} turf(s)`);
await mongoose.disconnect();