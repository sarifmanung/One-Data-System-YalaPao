export const API_CONTRACT_VERSION = '1.4' as const;

export const DASHBOARD_VIEW = 'dashboard.view' as const;
export const EMPLOYEE_PROFILE_READ = 'employee.profile.read' as const;
export const EMPLOYEE_MASTER_DATA_SYNC = 'employee.master-data.sync' as const;
export const EMPLOYEE_IDENTITY_MAPPING_MANAGE = 'employee.identity-mapping.manage' as const;
export const AUTHORIZATION_DELEGATED_APPROVER_MANAGE = 'authorization.delegated-approver.manage' as const;
export const LEAVE_REQUEST_READ = 'leave.request.read' as const;
export const LEAVE_REQUEST_CREATE = 'leave.request.create' as const;
export const LEAVE_REQUEST_SUBMIT = 'leave.request.submit' as const;
export const LEAVE_REQUEST_CANCEL = 'leave.request.cancel' as const;
export const LEAVE_PAPER_DECISION_RECORD = 'leave.paper-decision.record' as const;
export const LEAVE_REQUEST_VOID = 'leave.request.void' as const;
export const LEAVE_SNAPSHOT_MANAGE = 'leave.snapshot.manage' as const;
export const LEAVE_SNAPSHOT_SCHEDULE_MANAGE = 'leave.snapshot.schedule.manage' as const;
export const LEAVE_POLICY_MANAGE = 'leave.policy.manage' as const;

export const ONE_DATA_PERMISSIONS = [
  DASHBOARD_VIEW,
  EMPLOYEE_PROFILE_READ,
  EMPLOYEE_MASTER_DATA_SYNC,
  EMPLOYEE_IDENTITY_MAPPING_MANAGE,
  AUTHORIZATION_DELEGATED_APPROVER_MANAGE,
  LEAVE_REQUEST_READ,
  LEAVE_REQUEST_CREATE,
  LEAVE_REQUEST_SUBMIT,
  LEAVE_REQUEST_CANCEL,
  LEAVE_PAPER_DECISION_RECORD,
  LEAVE_REQUEST_VOID,
  LEAVE_SNAPSHOT_MANAGE,
  LEAVE_SNAPSHOT_SCHEDULE_MANAGE,
  LEAVE_POLICY_MANAGE,
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
  reconciliation: LeaveSnapshotReconciliationSummary;
}

export type LeaveSnapshotReconciliationStatus =
  | 'NOT_SENT'
  | 'PENDING'
  | 'MATCHED'
  | 'MISMATCH'
  | 'BLOCKED';

export interface LeaveSnapshotReconciliationSummary {
  status: LeaveSnapshotReconciliationStatus;
  localEmployees: number;
  localLeaveEntries: number;
  upstreamEmployees: number | null;
  upstreamLeaveEntries: number | null;
  periodMatches: boolean | null;
  versionMatches: boolean | null;
  employeeCountMatches: boolean | null;
  leaveEntryCountMatches: boolean | null;
  upstreamStatus: 'applied' | 'duplicate' | null;
  upstreamPeriodId: string | null;
  checkedAt: string | null;
  mismatchReasons: string[];
}

export type LeaveSnapshotScheduleStatus = 'DRAFT' | 'APPROVED' | 'PAUSED';

export interface LeaveSnapshotScheduleSummary {
  id: string;
  affiliationId: string;
  mode: 'MONTHLY_PREVIOUS_PERIOD';
  cutoffDays: number;
  contractVersion: string;
  status: LeaveSnapshotScheduleStatus;
  approvedBy: string | null;
  approvedAt: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface IdentityMappingSummary {
  id: string;
  externalSystem: string;
  externalSubject: string;
  employeeId: string;
  personId: string;
  isActive: boolean;
}

export interface PortalIdentityMappingSummary {
  id: string;
  externalSystem: string;
  externalSubject: string;
  employeeId: string | null;
  personId: string | null;
  isActive: boolean;
}

export interface SourceUserProjectionSummary {
  id: string;
  sourceSystem: string;
  sourceId: string;
  username: string;
  role: string;
  healthCenterSourceId: string | null;
  sourceEmployeeId: string | null;
  isActive: boolean;
  lastSeenAt: string;
}

export interface PortalIdentityMappingReport {
  summary: {
    sourceUsers: number;
    activeSourceUsers: number;
    sourceUsersWithEmployeeMapping: number;
    sourceUsersWithoutEmployeeMapping: number;
    portalMappings: number;
    activePortalMappings: number;
    portalMappingsWithoutEmployee: number;
  };
  sourceUsers: SourceUserProjectionSummary[];
  portalMappings: PortalIdentityMappingSummary[];
}

export type DelegatedApproverCapability =
  | typeof LEAVE_PAPER_DECISION_RECORD
  | typeof LEAVE_REQUEST_VOID;

export interface DelegatedApproverSummary {
  id: string;
  externalSystem: string;
  externalSubject: string;
  capability: DelegatedApproverCapability;
  workspaceKind: 'tenant' | 'affiliation';
  workspaceId: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  isActive: boolean;
  reason: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface LeavePolicyRuleSummary {
  id: string;
  leaveTypeId: string;
  leaveTypeCode: string;
  leaveTypeName: string;
  countingMode: 'WORKING_DAYS' | 'CALENDAR_DAYS';
  halfDayAllowed: boolean;
  entitlementDays: number | null;
  entitlementPeriod: string | null;
  carryOverAllowed: boolean;
  maxCarryOverDays: number | null;
  requiresSupportingDocument: boolean;
}

export interface LeavePolicyProfileSummary {
  id: string;
  affiliationId: string;
  code: string;
  name: string;
  employeeTypeScope: string;
  legalBasis: string | null;
  effectiveFrom: string;
  effectiveTo: string | null;
  status: 'DRAFT' | 'PUBLISHED' | 'RETIRED';
  approvedBy: string | null;
  approvedAt: string | null;
  rules: LeavePolicyRuleSummary[];
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
