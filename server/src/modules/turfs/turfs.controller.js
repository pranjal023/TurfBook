import * as svc from './turfs.service.js';

const ok = (res, data, status = 200) => res.status(status).json({ success: true, data });

export async function create(req, res) {
  ok(res, { turf: await svc.createTurf(req.body) }, 201);
}
export async function list(_req, res) {
  ok(res, { turfs: await svc.listTurfs() });
}
export async function getOne(req, res) {
  ok(res, { turf: await svc.getTurf(req.params.id) });
}
export async function update(req, res) {
  ok(res, { turf: await svc.updateTurf(req.params.id, req.body) });
}
export async function archive(req, res) {
  await svc.archiveTurf(req.params.id);
  ok(res, {});
}
export async function addImages(req, res) {
  ok(res, { turf: await svc.addImages(req.params.id, req.files) });
}
export async function removeImage(req, res) {
  ok(res, { turf: await svc.removeImage(req.params.id, req.params.imageId) });
}