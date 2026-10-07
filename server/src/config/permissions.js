export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  OWNER: 'owner',
  MANAGER: 'manager',
  RECEPTIONIST: 'receptionist',
  GROUND_STAFF: 'ground_staff',
  CUSTOMER: 'customer',
};


export const STAFF_ROLES = [ROLES.OWNER, ROLES.MANAGER, ROLES.RECEPTIONIST, ROLES.GROUND_STAFF];

const ALL_TENANT_PERMISSIONS = [
  'turf:read', 'turf:write', 'pricing:write',
  'booking:read', 'booking:create', 'booking:cancel',
  'checkin:scan', 'customer:read',
  'staff:read', 'staff:manage',
  'coupon:manage', 'analytics:view', 'subscription:manage',
];

const ROLE_PERMISSIONS = {
  [ROLES.SUPER_ADMIN]: ['tenant:manage', 'platform:analytics'],
  [ROLES.OWNER]: ALL_TENANT_PERMISSIONS,
  [ROLES.MANAGER]: ALL_TENANT_PERMISSIONS.filter(
    (p) => !['staff:manage', 'subscription:manage'].includes(p)
  ),
  [ROLES.RECEPTIONIST]: [
    'turf:read', 'booking:read', 'booking:create', 'booking:cancel', 'customer:read', 'checkin:scan',
  ],
  [ROLES.GROUND_STAFF]: ['booking:read', 'checkin:scan'],
  [ROLES.CUSTOMER]: [], 
};

const ASSIGNABLE = { [ROLES.OWNER]: [ROLES.MANAGER, ROLES.RECEPTIONIST, ROLES.GROUND_STAFF] };
export const assignableBy = (role) => ASSIGNABLE[role] ?? [];
export const permissionsFor = (role) => ROLE_PERMISSIONS[role] ?? [];
export const can = (role, permission) => permissionsFor(role).includes(permission);
