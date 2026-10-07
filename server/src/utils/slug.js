import crypto from 'node:crypto';

export function makeSlug(name) {
  const base =
    name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'business';
  return `${base}-${crypto.randomBytes(2).toString('hex')}`; 
}