import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { Turf } from '../models/Turf.js';

await connectDB();
const turfs = await Turf.find().setOptions({ skipTenant: true });
console.log(`Found ${turfs.length} turf(s)`);

for (const turf of turfs) {
  const min = Math.min(...turf.units.map((u) => u.basePrice));
 
  await Turf.updateOne({ _id: turf._id }, { $set: { minPrice: min } }).setOptions({ skipTenant: true });
  console.log(`  ${turf.name}: minPrice = ${min}`);
}

await mongoose.disconnect();