import { AsyncLocalStorage } from 'node:async_hooks';

const storage = new AsyncLocalStorage();

export const runWithTenant = (tenantId, fn) => storage.run({ tenantId: String(tenantId) }, fn);
export const getTenantId = () => storage.getStore()?.tenantId;