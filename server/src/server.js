import mongoose from 'mongoose';
import app from './app.js';
import { env } from './config/env.js';
import { connectDB } from './config/db.js';
import { startJobs } from './jobs/index.js';
import { Tenant } from './models/Tenant.js';
import { User } from './models/User.js';
import { RefreshToken } from './models/RefreshToken.js';
import { Turf } from './models/Turf.js';
import { Booking } from './models/Booking.js';
import { Payment } from './models/Payment.js';

async function start() {
  await connectDB();


  await Promise.all([
    Tenant.init(), User.init(), RefreshToken.init(),
    Turf.init(), Booking.init(), Payment.init(),
  ]);

  startJobs();

  const server = app.listen(env.PORT, () => {
    console.log(`API running on http://localhost:${env.PORT} [${env.NODE_ENV}]`);
  });

  
  const shutdown = async (signal) => {
    console.log(`${signal} received, shutting down...`);
    server.close(async () => {
      await mongoose.connection.close();
      process.exit(0);
    });
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});