import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { notFound } from './middleware/notFound.js';
import { errorHandler } from './middleware/errorHandler.js';
import authRouter from './modules/auth/auth.routes.js';
import turfRouter from './modules/turfs/turfs.routes.js';
import discoveryRouter from './modules/discovery/discovery.routes.js';
import paymentRouter from './modules/payments/payments.routes.js';
import teamRouter from './modules/staff/staff.routes.js';
import analyticsRouter from './modules/analytics/analytics.routes.js';
import { cashfreeWebhook } from './modules/payments/payments.controller.js';
import {
  publicRouter,
  customerRouter,
  staffRouter as bookingStaffRouter,
} from './modules/bookings/bookings.routes.js';

const app = express();

app.use(helmet());
app.use(cors({ origin: env.CLIENT_URL, credentials: true }));


app.post('/api/webhooks/cashfree', express.raw({ type: '*/*', limit: '1mb' }), cashfreeWebhook);

app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
if (env.NODE_ENV === 'development') app.use(morgan('dev'));

app.get('/api/health', (_req, res) => {
  res.json({ success: true, status: 'ok', uptime: process.uptime() });
});

app.use('/api/auth', authRouter);
app.use('/api/turfs', turfRouter);
app.use('/api/public', publicRouter);
app.use('/api/public', discoveryRouter);
app.use('/api/bookings', customerRouter);
app.use('/api/manage/bookings', bookingStaffRouter);
app.use('/api/payments', paymentRouter);
app.use('/api/staff', teamRouter);
app.use('/api/manage/analytics', analyticsRouter);

app.use(notFound);      
app.use(errorHandler);  

export default app;