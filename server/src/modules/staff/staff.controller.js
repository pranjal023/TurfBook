import * as svc from './staff.service.js';

const ok = (res, data, status = 200) => res.status(status).json({ success: true, data });

export async function roles(req, res) {
  ok(res, { roles: svc.listRoles(req.user.role) });
}
export async function list(_req, res) {
  ok(res, { staff: await svc.listStaff() });
}
export async function create(req, res) {
  ok(res, { member: await svc.createStaff(req.user, req.body) }, 201);
}
export async function update(req, res) {
  ok(res, { member: await svc.updateStaff(req.user, req.params.id, req.body) });
}