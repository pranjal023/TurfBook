import mongoose from 'mongoose';
import { tenantPlugin } from '../plugins/tenantPlugin.js';

const paymentSchema = new mongoose.Schema(
  {
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true, index: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    orderId: { type: String, required: true, unique: true },   
    paymentSessionId: { type: String },
    amount: { type: Number, required: true, min: 0, validate: Number.isInteger }, 

    status: { type: String, enum: ['created', 'paid'], default: 'created' },
    cfPaymentId: { type: String },
    paidAt: { type: Date },amountPaid: { type: Number },

   
    outcome: { type: String, enum: ['confirmed', 'refunded_late'] },
    flag: { type: String }, 

    refund: {
      refundId: String,   
      cfRefundId: String,
      amount: Number,
      reason: String,
      status: { type: String, enum: ['requested', 'pending', 'success', 'failed'] },refund: {
      refundId: String,
      cfRefundId: String,
      amount: Number,
      reason: String,
      status: { type: String, enum: ['requested', 'pending', 'success', 'failed'] },
      failureReason: String, 
    },
    },
  },
  { timestamps: true }
);

paymentSchema.index({ status: 1, createdAt: 1 });               // reconciler: open orders
paymentSchema.index({ 'refund.status': 1, updatedAt: 1 });      // reconciler: unfinished refunds

paymentSchema.plugin(tenantPlugin);

export const Payment = mongoose.model('Payment', paymentSchema);