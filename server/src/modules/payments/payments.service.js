import { Booking } from '../../models/Booking.js';
import { Payment } from '../../models/Payment.js';
import { User } from '../../models/User.js';
import { env } from '../../config/env.js';
import { AppError } from '../../utils/AppError.js';
import {
  createOrder, getOrderPayments, createRefund, getRefund, toPaise, toRupees,
} from '../../integrations/cashfree.js';

const skip = { skipTenant: true }; 

// checkout

export async function createCheckout(customerId, bookingId) {
  const booking = await Booking.findOne({ _id: bookingId, customerId }).setOptions(skip);
  if (!booking) throw new AppError('Booking not found', 404, 'BOOKING_NOT_FOUND');
  if (booking.status === 'confirmed') throw new AppError('Already paid', 409, 'ALREADY_PAID');
  if (booking.status !== 'held' || booking.holdExpiresAt <= new Date()) {
    throw new AppError('Your hold has expired. Pick the slot again.', 409, 'HOLD_EXPIRED');
  }

  
  const open = await Payment.findOne({ bookingId: booking._id, status: 'created' })
    .sort({ createdAt: -1 }).setOptions(skip);
  if (open) return { orderId: open.orderId, paymentSessionId: open.paymentSessionId, amount: open.amount };
  if (await Payment.exists({ bookingId: booking._id, status: 'paid' }).setOptions(skip)) {
    throw new AppError('Already paid', 409, 'ALREADY_PAID');
  }

  const user = await User.findById(customerId).select('name email phone');
  if (!user.phone && env.NODE_ENV === 'production') {
    throw new AppError('Add a phone number to your account to pay', 400, 'PHONE_REQUIRED');
  }

  const orderId = `tb_${booking._id}_${Date.now().toString(36)}`; 
  const order = await createOrder({
    orderId,
    amountPaise: booking.amount,
    customer: {
      id: String(user._id), name: user.name, email: user.email,
      phone: user.phone ?? '9999999999', 
    },
    notifyUrl: env.API_PUBLIC_URL ? `${env.API_PUBLIC_URL}/api/webhooks/cashfree` : undefined,
    note: `${booking.turfName} ${booking.date} ${booking.startTime}`.slice(0, 200),
  });


  await Payment.create({
    tenantId: booking.tenantId, 
    bookingId: booking._id,
    customerId,
    orderId,
    paymentSessionId: order.payment_session_id,
    amount: booking.amount,
  });

  return { orderId, paymentSessionId: order.payment_session_id, amount: booking.amount };
}


export async function settleSuccess({ orderId, cfPaymentId, orderAmountPaise, paidAmountPaise }) {
  const payment = await Payment.findOne({ orderId }).setOptions(skip);
  if (!payment) {
    console.warn(`Payment event for unknown order ${orderId}`);
    return { ignored: true };
  }


  if (orderAmountPaise !== payment.amount || paidAmountPaise < payment.amount) {
    console.error(
      `AMOUNT MISMATCH on ${orderId}: expected ${payment.amount}, order ${orderAmountPaise}, paid ${paidAmountPaise}`
    );
    await Payment.updateOne({ _id: payment._id }, { $set: { flag: 'AMOUNT_MISMATCH' } }).setOptions(skip);
    return { ignored: true };
  }

  
  await Payment.updateOne(
    { _id: payment._id, status: 'created' },
    {
      $set: { status: 'paid', cfPaymentId, paidAt: new Date(), amountPaid: paidAmountPaise },
      $unset: { flag: '' }, 
    }
  ).setOptions(skip);


  const fresh = await Payment.findById(payment._id).setOptions(skip);
  if (fresh.outcome) return { outcome: fresh.outcome };
  return finalise(fresh);
}

async function finalise(payment) {
  const now = new Date();
  const mine = { _id: payment.bookingId, customerId: payment.customerId };
  
  const confirm = {
    $set: { status: 'confirmed', active: true, paidAt: now, paymentId: payment._id },
    $unset: { holdExpiresAt: '' },
  };

 
  let booking = await Booking.findOneAndUpdate(
    { ...mine, status: 'held', holdExpiresAt: { $gt: now } }, confirm, { new: true }
  ).setOptions(skip);

  if (!booking) {
    const current = await Booking.findOne(mine).setOptions(skip);

    if (current?.status === 'confirmed' && String(current.paymentId) === String(payment._id)) {
      booking = current; 
    } else if (current && ['held', 'expired'].includes(current.status)) {
     
      try {
        booking = await Booking.findOneAndUpdate(
          { ...mine, status: { $in: ['held', 'expired'] } }, confirm, { new: true }
        ).setOptions(skip);
      } catch (err) {
        if (err?.code !== 11000) throw err;
      }
    }
    
  }

  if (booking) {
    await Payment.updateOne({ _id: payment._id }, { $set: { outcome: 'confirmed' } }).setOptions(skip);
    return { outcome: 'confirmed' };
  }

  
  await requestRefund(payment, { reason: 'Slot no longer available', outcome: 'refunded_late' });
  return { outcome: 'refunded_late' };
}

// refund

const REFUND_STATUS = { SUCCESS: 'success', CANCELLED: 'failed', FAILED: 'failed', PENDING: 'pending', ONHOLD: 'pending' };


export async function requestRefund(payment, { reason, outcome, amount = payment.amount }) {
  const claimed = await Payment.findOneAndUpdate(
    { _id: payment._id, status: 'paid', 'refund.refundId': { $exists: false } },
    {
      $set: {
        refund: { refundId: `rf_${payment.orderId}`, amount, reason, status: 'requested' },
        ...(outcome && { outcome }),
      },
    },
    { new: true }
  ).setOptions(skip);
  if (!claimed) return; 
  await sendRefund(claimed);
}

export async function sendRefund(payment, { checkFirst = false } = {}) {
  const { refundId, amount, reason } = payment.refund;
  try {
  
    let res = checkFirst ? await getRefund(payment.orderId, refundId) : null;
    res ??= await createRefund(payment.orderId, {
      refund_id: refundId, 
      refund_amount: toRupees(amount),
      refund_speed: 'STANDARD',
      refund_note: reason?.slice(0, 100),
    });
    await applyRefundStatus(refundId, res.refund_status, res.cf_refund_id);
  } catch (err) {
   
    const refused = [400, 422].includes(err.providerStatus);
    if (refused) {
      console.error(`Refund ${refundId} refused by Cashfree (${err.providerCode}): ${err.providerMessage}`);
      await Payment.updateOne(
        { 'refund.refundId': refundId, 'refund.status': { $in: ['requested', 'pending'] } },
        {
          $set: {
            'refund.status': 'failed',
            'refund.failureReason': `${err.providerCode ?? 'refused'}: ${err.providerMessage ?? ''}`.slice(0, 200),
          },
        }
      ).setOptions(skip);
    } else {
      console.error(`Refund ${refundId} not sent yet, reconciler will retry:`, err.message);
    }
  }
}

export async function applyRefundStatus(refundId, cashfreeStatus, cfRefundId) {
  const status = REFUND_STATUS[String(cashfreeStatus).toUpperCase()] ?? 'pending';
  await Payment.updateOne(
    { 'refund.refundId': refundId, 'refund.status': { $ne: 'success' } }, 
    { $set: { 'refund.status': status, ...(cfRefundId && { 'refund.cfRefundId': String(cfRefundId) }) } }
  ).setOptions(skip);
}


export async function issueCancellationRefund(booking) {
  const payment = await Payment.findOne({ bookingId: booking._id, status: 'paid', outcome: 'confirmed' }).setOptions(skip);

  if (payment && booking.refundAmount > 0) {
    await requestRefund(payment, {
      reason: booking.cancelledByRole === 'staff' ? 'Cancelled by venue' : 'Cancelled by customer',
      amount: Math.min(booking.refundAmount, payment.amount), 
    });
  }
  
  await Booking.updateOne({ _id: booking._id }, { $set: { refundPending: false } }).setOptions(skip);
}


export async function syncPayment(orderId) {
  const payments = await getOrderPayments(orderId);
  const list = Array.isArray(payments) ? payments : payments?.data ?? [];
  const ok = list.find((p) => p.payment_status === 'SUCCESS');
  if (!ok) return null;
  return settleSuccess({
    orderId,
    cfPaymentId: String(ok.cf_payment_id),
    orderAmountPaise: toPaise(ok.order_amount ?? ok.payment_amount),
    paidAmountPaise: toPaise(ok.payment_amount),
  });
}


export async function verifyBookingPayment(customerId, bookingId) {
  const booking = await Booking.findOne({ _id: bookingId, customerId }).setOptions(skip);
  if (!booking) throw new AppError('Booking not found', 404, 'BOOKING_NOT_FOUND');

  const latest = await Payment.findOne({ bookingId: booking._id }).sort({ createdAt: -1 }).setOptions(skip);
  if (latest?.status === 'created') await syncPayment(latest.orderId);

  const [b, p] = await Promise.all([
    Booking.findById(booking._id).setOptions(skip),
    latest ? Payment.findById(latest._id).setOptions(skip) : null,
  ]);
  const lapsed = b.status === 'held' && b.holdExpiresAt <= new Date();
  return {
    bookingStatus: lapsed ? 'expired' : b.status,
    paymentStatus: p?.status ?? 'none',
    outcome: p?.outcome ?? null,
    refundStatus: p?.refund?.status ?? null,
  };
}



export async function handleWebhookEvent(event) {
  switch (event?.type) {
    case 'PAYMENT_SUCCESS_WEBHOOK': {
      const { order, payment } = event.data;
      return settleSuccess({
        orderId: order.order_id,
        cfPaymentId: String(payment.cf_payment_id),
        orderAmountPaise: toPaise(order.order_amount ?? payment.payment_amount),
        paidAmountPaise: toPaise(payment.payment_amount),
      });
    }
    case 'REFUND_STATUS_WEBHOOK': {
      const r = event.data.refund;
      return applyRefundStatus(r.refund_id, r.refund_status, r.cf_refund_id);
    }
    default:
      return; 
  }
}