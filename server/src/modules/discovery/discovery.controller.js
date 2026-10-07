import * as svc from './discovery.service.js';
import { searchSchema } from './discovery.schemas.js';

const ok = (res, data) => res.json({ success: true, data });

export async function search(req, res) {
  ok(res, await svc.searchTurfs(searchSchema.parse(req.query)));
}
export async function detail(req, res) {
  ok(res, { turf: await svc.getPublicTurf(req.params.id) });
}
export async function meta(_req, res) {
  ok(res, await svc.getMeta());
}