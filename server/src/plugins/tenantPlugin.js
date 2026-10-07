import mongoose from 'mongoose';
import { getTenantId } from '../utils/tenantContext.js';

const QUERY_OPS = [
  'find', 'findOne', 'findOneAndUpdate', 'findOneAndDelete', 'findOneAndReplace',
  'updateOne', 'updateMany', 'replaceOne', 'deleteOne','distinct', 'deleteMany', 'countDocuments',
];

export function tenantPlugin(schema) {
  schema.add({
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
      immutable: true, 
    },
  });

 
  schema.pre(QUERY_OPS, { document: false, query: true }, function () {
    if (this.getOptions().skipTenant) return; 
    const tenantId = getTenantId();
    if (!tenantId) throw new Error('Tenant context missing: query blocked');
    this.where({ tenantId });
  });


  schema.pre('validate', function () {
    if (!this.isNew) return;
    const ctx = getTenantId();
    if (ctx) {
      if (this.tenantId && String(this.tenantId) !== ctx) throw new Error('Cross-tenant write blocked');
      this.tenantId = ctx;
    } else if (!this.tenantId) {
      throw new Error('Tenant context missing: cannot create document');
    }
  });

  
  schema.pre('aggregate', function () {
    if (this.options.skipTenant) return;
    const tenantId = getTenantId();
    if (!tenantId) throw new Error('Tenant context missing: aggregate blocked');
    this.pipeline().unshift({ $match: { tenantId: new mongoose.Types.ObjectId(tenantId) } });
  });
}