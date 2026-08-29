import type {
  ApiEnvelope,
  CurrentUser,
  LeaveRequestSummary,
  LeaveTypeSummary,
  PersonListItem,
} from '@onedata/contracts';

type ApiHealth = {
  reachable: boolean;
  status: 'ok' | 'degraded' | 'unavailable';
  service: string;
};

type HealthEnvelope = {
  data?: {
    status?: 'ok' | 'degraded';
    service?: string;
  };
};

export async function getCurrentUser(cookieHeader = ''): Promise<CurrentUser | null> {
  const apiUrl = process.env.ONEDATA_API_URL ?? 'http://localhost:3100';

  try {
    const response = await fetch(`${apiUrl}/api/v1/me`, {
      headers: {
        accept: 'application/json',
        ...(cookieHeader ? { cookie: cookieHeader } : {}),
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      return null;
    }

    const envelope = await response.json() as ApiEnvelope<CurrentUser>;
    return envelope.data;
  } catch {
    return null;
  }
}

export async function getApiHealth(): Promise<ApiHealth> {
  const apiUrl = process.env.ONEDATA_API_URL ?? 'http://localhost:3100';

  try {
    const response = await fetch(`${apiUrl}/api/health/live`, {
      headers: { accept: 'application/json' },
      cache: 'no-store',
    });

    if (!response.ok) {
      return { reachable: false, status: 'unavailable', service: 'onedata-api' };
    }

    const envelope = await response.json() as HealthEnvelope;
    return {
      reachable: true,
      status: envelope.data?.status ?? 'degraded',
      service: envelope.data?.service ?? 'onedata-api',
    };
  } catch {
    return { reachable: false, status: 'unavailable', service: 'onedata-api' };
  }
}

async function getFromApi<T>(
  path: string,
  cookieHeader: string,
  tenantId?: string,
): Promise<T | null> {
  const apiUrl = process.env.ONEDATA_API_URL ?? 'http://localhost:3100';

  try {
    const response = await fetch(`${apiUrl}${path}`, {
      headers: {
        accept: 'application/json',
        ...(cookieHeader ? { cookie: cookieHeader } : {}),
        ...(tenantId ? { 'x-tenant-id': tenantId } : {}),
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      return null;
    }

    const envelope = await response.json() as ApiEnvelope<T>;
    return envelope.data;
  } catch {
    return null;
  }
}

export function getLeaveTypes(
  cookieHeader = '',
  tenantId?: string,
): Promise<LeaveTypeSummary[] | null> {
  return getFromApi<{ items: LeaveTypeSummary[] }>('/api/v1/leave/types', cookieHeader, tenantId)
    .then((data) => data?.items ?? null);
}

export function getLeaveRequests(
  cookieHeader = '',
  tenantId?: string,
): Promise<LeaveRequestSummary[] | null> {
  return getFromApi<{ items: LeaveRequestSummary[] }>('/api/v1/leave/requests', cookieHeader, tenantId)
    .then((data) => data?.items ?? null);
}

export function getPeople(
  cookieHeader = '',
  tenantId?: string,
): Promise<PersonListItem[] | null> {
  return getFromApi<{ items: PersonListItem[] }>('/api/v1/people', cookieHeader, tenantId)
    .then((data) => data?.items ?? null);
}
