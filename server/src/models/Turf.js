import mongoose from 'mongoose';
import { tenantPlugin } from '../plugins/tenantPlugin.js';
import { SPORTS, FACILITIES } from '../config/catalog.js';
import { TIME_RE, toMinutes } from '../utils/time.js';


const unitSchema = new mongoose.Schema({
  key: { type: String, required: true, lowercase: true, trim: true, match: /^[a-z0-9-]{1,30}$/ },
  name: { type: String, required: true, trim: true, maxlength: 60 },
  basePrice: {
    type: Number, required: true, min: 0,
    validate: { validator: Number.isInteger, message: 'basePrice must be a whole number of paise' },
  },
  blocks: { type: [String], default: [] },  
});

const imageSchema = new mongoose.Schema({
  url: { type: String, required: true },
  publicId: { type: String, required: true }, 
});


const peakRuleSchema = new mongoose.Schema(
  {
    startTime: { type: String, required: true, match: TIME_RE },
    endTime: { type: String, required: true, match: TIME_RE },
    surchargePercent: { type: Number, required: true, min: 0, max: 300, validate: Number.isInteger },
  },
  { _id: false }
);

const turfSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, trim: true, maxlength: 1000 },
    address: {
      line1: { type: String, required: true, trim: true },
      area: { type: String, trim: true },
      city: { type: String, required: true, trim: true },
      state: { type: String, required: true, trim: true },
      pincode: { type: String, required: true, match: /^\d{6}$/ },
    },
    
    location: {
      type: { type: String, enum: ['Point'], required: true, default: 'Point' },
      coordinates: {
        type: [Number], required: true,
        validate: { validator: (v) => v.length === 2, message: 'coordinates must be [lng, lat]' },
      },
    },
    sports: { type: [{ type: String, enum: SPORTS }], validate: [(v) => v.length > 0, 'Pick at least one sport'] },
    facilities: { type: [{ type: String, enum: FACILITIES }], default: [] },
    units: { type: [unitSchema], validate: [(v) => v.length > 0, 'A turf needs at least one unit'] },
    openTime: { type: String, required: true, match: TIME_RE },
    closeTime: { type: String, required: true, match: TIME_RE },
    slotDurationMinutes: { type: Number, required: true, enum: [30, 60, 90, 120] },

    pricing: {
      weekendSurchargePercent: { type: Number, default: 0, min: 0, max: 300, validate: Number.isInteger },
      peakRules: { type: [peakRuleSchema], default: [] },
    },
    minPrice: { type: Number, default: 0 },

    timezone: { type: String, default: 'Asia/Kolkata' },
    images: { type: [imageSchema], default: [] },
    status: { type: String, enum: ['active', 'inactive', 'archived'], default: 'active' },
  },
  { timestamps: true }
);


turfSchema.pre('validate', function () {
  const keys = this.units.map((u) => u.key);
  if (new Set(keys).size !== keys.length) this.invalidate('units', 'Unit keys must be unique');

  for (const unit of this.units) {
    for (const blocked of unit.blocks) {
      if (blocked === unit.key || !keys.includes(blocked)) {
        this.invalidate('units', `Unit "${unit.key}" blocks unknown unit "${blocked}"`);
      }
    }
  }

  if (this.openTime && this.closeTime && this.slotDurationMinutes) {
    const span = toMinutes(this.closeTime) - toMinutes(this.openTime);
    if (span <= 0 || span % this.slotDurationMinutes !== 0) {
      this.invalidate('closeTime', 'Opening hours must be positive and fit a whole number of slots');
    }
  }

  for (const rule of this.pricing?.peakRules ?? []) {
    if (toMinutes(rule.endTime) <= toMinutes(rule.startTime)) {
      this.invalidate('pricing', 'A peak rule must end after it starts');
    }
  }


  if (this.units?.length) this.minPrice = Math.min(...this.units.map((u) => u.basePrice));
});

turfSchema.index({ location: '2dsphere' });          
turfSchema.index({ tenantId: 1, status: 1 });        
turfSchema.index({ status: 1, 'address.city': 1 });  
turfSchema.index({ status: 1, sports: 1 });
turfSchema.index({ status: 1, minPrice: 1 });

turfSchema.plugin(tenantPlugin); // adds tenantId and the isolation hooks

export const Turf = mongoose.model('Turf', turfSchema);