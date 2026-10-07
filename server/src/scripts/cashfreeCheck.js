import { env } from '../config/env.js';
import { cashfreeEnabled, createOrder } from '../integrations/cashfree.js';

const mask = (s) => (s ? `${s.slice(0, 9)}… (${s.length} chars)` : '(missing)');

console.log({
  enabled: cashfreeEnabled,
  mode: env.CASHFREE_ENV,
  apiVersion: env.CASHFREE_API_VERSION,
  appId: mask(env.CASHFREE_APP_ID),
  secret: mask(env.CASHFREE_SECRET_KEY),
});

try {
  const order = await createOrder({
    orderId: `check_${Date.now()}`,
    amountPaise: 10000,
    customer: { id: 'check_user', name: 'Check', email: 'check@example.com', phone: '9999999999' },
  });
  console.log('SUCCESS: order created, status =', order.order_status);
} catch (err) {
  console.log('FAILED:', err.code, 'provider status', err.providerStatus);
}
process.exit(0);