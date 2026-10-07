import mongoose from 'mongoose';
import { ROLES, STAFF_ROLES } from '../config/permissions.js';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    passwordHash: { type: String, required: true, select: false }, 
    role: { type: String, enum: Object.values(ROLES), required: true },
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', index: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);


userSchema.pre('validate', function () {
  const isStaff = STAFF_ROLES.includes(this.role);
  if (isStaff && !this.tenantId) this.invalidate('tenantId', 'Staff must belong to a tenant');
  if (!isStaff && this.tenantId) this.invalidate('tenantId', `${this.role} cannot belong to a tenant`);
});

export const User = mongoose.model('User', userSchema);