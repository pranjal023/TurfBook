import mongoose from 'mongoose';
import { tenantPlugin } from '../plugins/tenantPlugin.js';

export const ACTIVE_STATUSES = ['held', 'confirmed'];

const bookingSchema = new mongoose.Schema(
  {
    turfId: { type: mongoose.Schema.Types.ObjectId, ref: 'Turf', required: true },
    turfName: { type: String, required: true },         
    unitKey: { type: String, required: true },
    lockedUnits: { type: [String], validate: [(v) => v.length > 0, 'lockedUnits required'] },

    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true }, 
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },               
    customerName: { type: String, required: true },      
    customerPhone: { type: String },                   
    source: { type: String, enum: ['online', 'walk_in'], required: true },

    date: { type: String, required: true },              
    startTime: { type: String, required: true },         
    endTime: { type: String, required: true },
    startAt: { type: Date, required: true },             
    endAt: { type: Date, required: true },

    amount: { type: Number, required: true, min: 0, validate: Number.isInteger },
    status: {
      type: String,
      enum: ['held', 'confirmed', 'cancelled', 'expired', 'completed'],
      required: true,
    },
    holdExpiresAt: { type: Date },
    active: { type: Boolean, default: false },          

    // Payment (Step 9)
    paidAt: { type: Date },
    paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' },

    // Cancellation (Step 10)
    cancelledAt: { type: Date },
    cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    cancelledByRole: { type: String, enum: ['customer', 'staff'] }, 
    cancelReason: { type: String, maxlength: 200 },
    refundAmount: { type: Number, min: 0, default: 0 },  
    refundPending: { type: Boolean },                    
  },
  { timestamps: true }
);

bookingSchema.pre('validate', function () {
  this.active = ACTIVE_STATUSES.includes(this.status);
  if (this.status === 'held' && !this.holdExpiresAt) this.invalidate('holdExpiresAt', 'A hold needs an expiry');
});


bookingSchema.index(
  { turfId: 1, startAt: 1, lockedUnits: 1 },
  { unique: true, partialFilterExpression: { active: true }, name: 'uniq_active_slot_unit' }
);

bookingSchema.index({ tenantId: 1, date: 1, turfId: 1 });  
bookingSchema.index({ customerId: 1, startAt: -1 });       
bookingSchema.index({ status: 1, holdExpiresAt: 1 });      
bookingSchema.index(                                      
  { refundPending: 1, cancelledAt: 1 },
  { partialFilterExpression: { refundPending: true } }
);
bookingSchema.index({ tenantId: 1, status: 1, startAt: 1 }); 

bookingSchema.plugin(tenantPlugin);

export const Booking = mongoose.model('Booking', bookingSchema);