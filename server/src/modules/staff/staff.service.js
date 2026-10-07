import { User } from '../../models/User.js';
import { RefreshToken } from '../../models/RefreshToken.js';
import { ROLES, STAFF_ROLES, assignableBy, permissionsFor } from '../../config/permissions.js';
import { AppError } from '../../utils/AppError.js';
import { getTenantId } from '../../utils/tenantContext.js';
import { hashPassword } from '../../utils/password.js';


const PUBLIC_FIELDS = 'name email phone role isActive createdAt';

const forbid = (message, code) => new AppError(message, 403, code);


export function listRoles(actorRole) {
  return assignableBy(actorRole).map((role) => ({ role, permissions: permissionsFor(role) }));
}


export function listStaff() {
  return User.find({ tenantId: getTenantId(), role: { $in: STAFF_ROLES } })
    .select(PUBLIC_FIELDS)
    .sort({ createdAt: 1 }); 
}

export async function createStaff(actor, { name, email, phone, role, password }) {
  if (!assignableBy(actor.role).includes(role)) throw forbid('You cannot assign that role', 'CANNOT_ASSIGN_ROLE');
  if (await User.exists({ email })) throw new AppError('Email already registered', 409, 'EMAIL_TAKEN');

  const user = await User.create({
    name, email, phone, role,
    passwordHash: await hashPassword(password),
    tenantId: getTenantId(), 
  });
  return { _id: user._id, name: user.name, email: user.email, phone: user.phone, role: user.role, isActive: user.isActive, createdAt: user.createdAt };
}

export async function updateStaff(actor, id, patch) {
  const tenantId = getTenantId();

 
  const target = await User.findOne({ _id: id, tenantId, role: { $in: STAFF_ROLES } });
  if (!target) throw new AppError('Staff member not found', 404, 'STAFF_NOT_FOUND');

  if (String(target._id) === actor.id) throw forbid('You cannot change your own account here', 'CANNOT_EDIT_SELF');
  if (target.role === ROLES.OWNER) throw forbid('The business owner cannot be modified', 'CANNOT_MODIFY_OWNER');
  if (patch.role && !assignableBy(actor.role).includes(patch.role)) {
    throw forbid('You cannot assign that role', 'CANNOT_ASSIGN_ROLE');
  }

  const set = {};
  for (const key of ['name', 'phone', 'role', 'isActive']) if (patch[key] !== undefined) set[key] = patch[key];
  if (patch.password) set.passwordHash = await hashPassword(patch.password);


  const updated = await User.findOneAndUpdate(
    { _id: target._id, tenantId, role: { $ne: ROLES.OWNER } },
    { $set: set },
    { new: true }
  ).select(PUBLIC_FIELDS);
  if (!updated) throw new AppError('This account just changed. Refresh and try again.', 409, 'CONFLICT');


  if (patch.isActive === false || patch.password) await RefreshToken.deleteMany({ userId: target._id });

  return updated;
}