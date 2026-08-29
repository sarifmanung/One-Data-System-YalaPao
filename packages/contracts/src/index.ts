export const API_CONTRACT_VERSION = '1.1' as const;

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
  workspaces: WorkspaceSummary[];
  employeeId?: string;
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
  approvedDays: number | null;
  reason: string | null;
  version: number;
}
