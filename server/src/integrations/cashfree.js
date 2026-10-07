import crypto from 'node:crypto';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';

export const cashfreeEnabled = Boolean(env.CASHFREE_APP_ID && env.CASHFREE_SECRET_KEY);

const BASE = env.CASHFREE_ENV === 'production' ? 'https://api.cashfree.com/pg' : 'https://sandbox.cashfree.com/pg';


export const toRupees = (paise) => Number((paise / 100).toFixed(2));
export const toPaise = (rupees) => Math.round(Number(rupees) * 100);

async function call(method, path, body) {
  if (!cashfreeEnabled) throw new AppError('Payments are not configured', 503, 'PAYMENTS_DISABLED');

  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'x-api-version': env.CASHFREE_API_VERSION,
        'x-client-id': env.CASHFREE_APP_ID,
        'x-client-secret': env.CASHFREE_SECRET_KEY,
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(10_000), 
    });
  } catch {
    throw new AppError('Payment provider unreachable', 502, 'PROVIDER_UNREACHABLE');
  }

  const data = await res.json().catch(() => ({}));
   if (!res.ok) {
    console.error(`Cashfree ${method} ${path} -> ${res.status}`, data); 
    const err = new AppError('Payment provider error', 502, 'PROVIDER_ERROR');
    err.providerStatus = res.status;
    err.providerCode = data.code;
    err.providerMessage = data.message;
    throw err;
  }
  return data;
}

export const createOrder = ({ orderId, amountPaise, customer, notifyUrl, note }) =>
  call('POST', '/orders', {
    order_id: orderId,
    order_amount: toRupees(amountPaise),
    order_currency: 'INR',
    customer_details: {
      customer_id: customer.id,
      customer_name: customer.name,
      customer_email: customer.email,
      customer_phone: customer.phone,
    },
    order_meta: notifyUrl ? { notify_url: notifyUrl } : {},
    order_note: note,
  });

export const getOrderPayments = (orderId) => call('GET', `/orders/${encodeURIComponent(orderId)}/payments`);

export const createRefund = (orderId, body) => call('POST', `/orders/${encodeURIComponent(orderId)}/refunds`, body);

export async function getRefund(orderId, refundId) {
  try {
    return await call('GET', `/orders/${encodeURIComponent(orderId)}/refunds/${encodeURIComponent(refundId)}`);
  } catch (err) {
    if (err.providerStatus === 404) return null; 
    throw err;
  }
}


export function verifyWebhookSignature(rawBody, signature, timestamp, secret = env.CASHFREE_SECRET_KEY) {
  if (!signature || !timestamp || !secret) return false;
  const expected = crypto.createHmac('sha256', secret).update(timestamp + rawBody).digest('base64');
  const a = Buffer.from(expected);
  const b = Buffer.from(String(signature));
  return a.length === b.length && crypto.timingSafeEqual(a, b); 
}