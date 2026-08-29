import {
  AUTHORIZATION_DELEGATED_APPROVER_MANAGE,
  EMPLOYEE_IDENTITY_MAPPING_MANAGE,
  EMPLOYEE_MASTER_DATA_SYNC,
  EMPLOYEE_PROFILE_READ,
  LEAVE_PAPER_DECISION_RECORD,
  LEAVE_REQUEST_CANCEL,
  LEAVE_REQUEST_CREATE,
  LEAVE_REQUEST_READ,
  LEAVE_REQUEST_SUBMIT,
  LEAVE_REQUEST_VOID,
  LEAVE_SNAPSHOT_MANAGE,
} from '@onedata/contracts';
import type { CurrentUser, OneDataPermission } from '@onedata/contracts';

export const ONE_DATA_ALL_PERMISSION = '*' as const;

export const ONE_DATA_PERMISSION_GRANTS = [
  'dashboard.view',
  'employee.profile.read',
  'employee.master-data.sync',
  'employee.identity-mapping.manage',
  'authorization.delegated-approver.manage',
  'leave.request.read',
  'leave.request.create',
  'leave.request.submit',
  'leave.request.cancel',
  'leave.paper-decision.record',
  'leave.request.void',
  'leave.snapshot.manage',
] as const satisfies readonly OneDataPermission[];

export type OneDataPermissionGrant =
  | (typeof ONE_DATA_PERMISSION_GRANTS)[number]
  | typeof ONE_DATA_ALL_PERMISSION;

export interface PortalAuthorizationClaims {
  roles?: unknown;
  positions?: unknown;
}

const REQUESTER_PERMISSIONS: readonly OneDataPermission[] = [
  'dashboard.view',
  'leave.request.read',
  'leave.request.create',
  'leave.request.submit',
  'leave.request.cancel',
];

const VIEWER_PERMISSIONS: readonly OneDataPermission[] = [
  'dashboard.view',
  'employee.profile.read',
  'leave.request.read',
];

const MANAGER_PERMISSIONS: readonly OneDataPermission[] = [
  ...VIEWER_PERMISSIONS,
  'leave.request.create',
  'leave.request.submit',
  'leave.request.cancel',
  'leave.paper-decision.record',
  'leave.request.void',
];

const PEOPLE_ADMIN_PERMISSIONS: readonly OneDataPermission[] = [
  ...MANAGER_PERMISSIONS,
  'employee.master-data.sync',
  'employee.identity-mapping.manage',
  AUTHORIZATION_DELEGATED_APPROVER_MANAGE,
  'leave.snapshot.manage',
];

const ROLE_PERMISSIONS: Readonly<Record<string, readonly OneDataPermission[] | typeof ONE_DATA_ALL_PERMISSION>> = {
  DEVELOPMENT_ONLY: ONE_DATA_ALL_PERMISSION,
  super_admin: ONE_DATA_ALL_PERMISSION,
  health_admin: PEOPLE_ADMIN_PERMISSIONS,
  health_division_director: PEOPLE_ADMIN_PERMISSIONS,
  health_admin_officer: PEOPLE_ADMIN_PERMISSIONS,
  health_staff: VIEWER_PERMISSIONS,
  pcu_staff: REQUESTER_PERMISSIONS,
  pcu_director: MANAGER_PERMISSIONS,
  viewer: VIEWER_PERMISSIONS,
  PAPER_RESULT_RECORDER: [
    'dashboard.view',
    'leave.request.read',
    'leave.paper-decision.record',
    'leave.request.void',
  ],
  PEOPLE_SYNC_ADMIN: [
    'dashboard.view',
    'employee.profile.read',
    'employee.master-data.sync',
    'employee.identity-mapping.manage',
  ],
  SPECIAL_SNAPSHOT_ADMIN: [
    'dashboard.view',
    'leave.request.read',
    'leave.snapshot.manage',
  ],
};

const POSITION_PERMISSIONS: Readonly<Record<string, readonly OneDataPermission[] | typeof ONE_DATA_ALL_PERMISSION>> = {
  health_division_director: PEOPLE_ADMIN_PERMISSIONS,
  health_admin_officer: PEOPLE_ADMIN_PERMISSIONS,
  pcu_director: MANAGER_PERMISSIONS,
  pcu_public_health_officer: [
    ...VIEWER_PERMISSIONS,
    ...REQUESTER_PERMISSIONS.filter((permission) => permission !== 'dashboard.view' && permission !== 'leave.request.read'),
  ],
  executive_viewer: VIEWER_PERMISSIONS,
};

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    .map((item) => item.trim());
}

function addGrant(grants: Set<string>, value: readonly OneDataPermission[] | typeof ONE_DATA_ALL_PERMISSION): void {
  if (value === ONE_DATA_ALL_PERMISSION) {
    grants.add(ONE_DATA_ALL_PERMISSION);
    return;
  }

  for (const permission of value) {
    grants.add(permission);
  }
}

/**
 * Map signed Portal role/position codes to One Data capabilities.
 * Unknown codes intentionally grant nothing; Portal module access alone is
 * not treated as permission to mutate One Data data.
 */
export function permissionsFromPortalClaims(claims: PortalAuthorizationClaims): string[] {
  const grants = new Set<string>();

  for (const role of stringArray(claims.roles)) {
    const permissionSet = ROLE_PERMISSIONS[role];
    if (permissionSet) {
      addGrant(grants, permissionSet);
    }
  }

  for (const position of stringArray(claims.positions)) {
    const permissionSet = POSITION_PERMISSIONS[position];
    if (permissionSet) {
      addGrant(grants, permissionSet);
    }
  }

  return [...grants].sort();
}

export function hasOneDataPermission(user: Pick<CurrentUser, 'permissions'>, permission: OneDataPermission): boolean {
  return user.permissions.includes(ONE_DATA_ALL_PERMISSION) || user.permissions.includes(permission);
}

export type OneDataScope = 'self' | 'tenant' | 'affiliation';

/**
 * The scope matrix is intentionally derived from the operation, not from a
 * raw Portal role. Portal roles grant capabilities; One Data decides the
 * maximum data scope for each capability here.
 */
export function scopeForPermission(
  user: Pick<CurrentUser, 'permissions'>,
  permission: OneDataPermission,
): OneDataScope | null {
  if (!hasOneDataPermission(user, permission)) {
    return null;
  }

  if (
    permission === EMPLOYEE_MASTER_DATA_SYNC
    || permission === EMPLOYEE_IDENTITY_MAPPING_MANAGE
    || permission === AUTHORIZATION_DELEGATED_APPROVER_MANAGE
    || permission === LEAVE_SNAPSHOT_MANAGE
  ) {
    return 'affiliation';
  }

  if (permission === LEAVE_REQUEST_CREATE
    || permission === LEAVE_REQUEST_SUBMIT
    || permission === LEAVE_REQUEST_CANCEL) {
    return 'self';
  }

  if (permission === LEAVE_PAPER_DECISION_RECORD || permission === LEAVE_REQUEST_VOID) {
    return 'tenant';
  }

  if (permission === EMPLOYEE_PROFILE_READ) {
    return hasOneDataPermission(user, EMPLOYEE_MASTER_DATA_SYNC) ? 'affiliation' : 'tenant';
  }

  if (permission === LEAVE_REQUEST_READ) {
    if (hasOneDataPermission(user, LEAVE_PAPER_DECISION_RECORD)
      || hasOneDataPermission(user, LEAVE_REQUEST_VOID)
      || hasOneDataPermission(user, EMPLOYEE_PROFILE_READ)) {
      return hasOneDataPermission(user, EMPLOYEE_MASTER_DATA_SYNC) ? 'affiliation' : 'tenant';
    }
    return 'self';
  }

  return 'tenant';
}
