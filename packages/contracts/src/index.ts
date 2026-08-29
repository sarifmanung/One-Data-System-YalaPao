export const API_CONTRACT_VERSION = '1.3' as const;

export const DASHBOARD_VIEW = 'dashboard.view' as const;
export const EMPLOYEE_PROFILE_READ = 'employee.profile.read' as const;
export const EMPLOYEE_MASTER_DATA_SYNC = 'employee.master-data.sync' as const;
export const EMPLOYEE_IDENTITY_MAPPING_MANAGE = 'employee.identity-mapping.manage' as const;
export const LEAVE_REQUEST_READ = 'leave.request.read' as const;
export const LEAVE_REQUEST_CREATE = 'leave.request.create' as const;
export const LEAVE_REQUEST_SUBMIT = 'leave.request.submit' as const;
export const LEAVE_REQUEST_CANCEL = 'leave.request.cancel' as const;
export const LEAVE_PAPER_DECISION_RECORD = 'leave.paper-decision.record' as const;
export const LEAVE_REQUEST_VOID = 'leave.request.void' as const;
export const LEAVE_SNAPSHOT_MANAGE = 'leave.snapshot.manage' as const;

export const ONE_DATA_PERMISSIONS = [
  DASHBOARD_VIEW,
  EMPLOYEE_PROFILE_READ,
  EMPLOYEE_MASTER_DATA_SYNC,
  EMPLOYEE_IDENTITY_MAPPING_MANAGE,
  LEAVE_REQUEST_READ,
  LEAVE_REQUEST_CREATE,
  LEAVE_REQUEST_SUBMIT,
  LEAVE_REQUEST_CANCEL,
  LEAVE_PAPER_DECISION_RECORD,
  LEAVE_REQUEST_VOID,
  LEAVE_SNAPSHOT_MANAGE,
] as const;

export type OneDataPermission = (typeof ONE_DATA_PERMISSIONS)[number];

export const LEAVE_STATUSES = [
  'DRAFT',
  'SUBMITTED',
  'PAPER_APPROVED',
  'PAPER_REJECTED',
  'CANCELLED',
  'VOIDED',
] as const;

export type LeaveStatus = (typeof LEAVE_STATUSES)[number];

export const EFFECTIVE_LEAVE_STATUS = 'PAPER_APPROVED' as const;

export const NON_EFFECTIVE_LEAVE_STATUSES = [
  'DRAFT',
  'SUBMITTED',
  'PAPER_REJECTED',
  'CANCELLED',
  'VOIDED',
] as const satisfies readonly LeaveStatus[];

export interface ApiEnvelope<T> {
  data: T;
  requestId: string;
}

export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  code: string;
  detail: string;
  fields: Array<{ field: string; message: string }>;
  requestId: string;
}

export interface WorkspaceSummary {
  id: string;
  kind: 'affiliation' | 'tenant';
  code: string;
  name: string;
  role: string;
}

export interface CurrentUser {
  id: string;
  username: string;
  displayName: string;
  roles: string[];
  permissions: string[];
  workspaces: WorkspaceSummary[];
  employeeId?: string;
}

export interface AuthSessionResponse {
  authenticated: true;
  user: CurrentUser;
  expiresAt: string;
}

export interface LogoutResponse {
  authenticated: false;
}

export interface TargetContractMetadata {
  contractVersion: typeof API_CONTRACT_VERSION;
  leaveEffectiveStatus: typeof EFFECTIVE_LEAVE_STATUS;
  deprecatedLeaveStatuses: readonly ['CONFIRMED'];
  targetStack: {
    api: 'NestJS';
    web: 'Next.js';
  };
}

export interface PersonListItem {
  id: string;
  employeeId: string;
  displayName: string;
  positionGroup: string | null;
  positionName: string | null;
  tenantId: string;
  tenantName: string;
  isActive: boolean;
}

export interface MasterDataSyncReport {
  syncRunId: string;
  sourceSystem: string;
  status: 'SUCCEEDED';
  sourceStartedAt: string;
  sourceCompletedAt: string;
  healthCentersFetched: number;
  employeesFetched: number;
  usersFetched: number;
  usersWithEmployeeMapping: number;
  usersWithoutEmployeeMapping: number;
  tenantsUpserted: number;
  employeesUpserted: number;
  employeesDeactivated: number;
  membershipsCreated: number;
  membershipsClosed: number;
}

export type LeaveExportBatchStatus =
  | 'PREPARED'
  | 'DELIVERING'
  | 'APPLIED'
  | 'DUPLICATE'
  | 'RETRYABLE_FAILURE'
  | 'FAILED';

export type LeaveExportDeliveryStatus =
  | 'PENDING'
  | 'SENDING'
  | 'APPLIED'
  | 'DUPLICATE'
  | 'FAILED';

export interface LeaveExportDeliverySummary {
  id: string;
  attempt: number;
  status: LeaveExportDeliveryStatus;
  httpStatus: number | null;
  retryable: boolean;
  nextAttemptAt: string | null;
  sentAt: string | null;
  lastError: string | null;
  response: Record<string, unknown> | null;
  createdAt: string;
}

export interface LeaveExportBatchSummary {
  id: string;
  affiliationId: string;
  period: string;
  snapshotVersion: number;
  contractVersion: string;
  status: LeaveExportBatchStatus;
  sourceCutoff: string;
  sourceHash: string;
  idempotencyKey: string;
  processedEmployees: number;
  processedLeaveEntries: number;
  lastError: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  deliveries: LeaveExportDeliverySummary[];
}

export interface IdentityMappingSummary {
  id: string;
  externalSystem: string;
  externalSubject: string;
  employeeId: string;
  personId: string;
  isActive: boolean;
}

export interface LeaveTypeSummary {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
}

export interface LeaveRequestSummary {
  id: string;
  tenantId: string;
  employeeId: string;
  employeeDisplayName: string;
  leaveType: LeaveTypeSummary;
  status: LeaveStatus;
  startsOn: string;
  endsOn: string;
  requestedDays: number | null;
  calculationBasis: string | null;
  approvedDays: number | null;
  reason: string | null;
  version: number;
}
