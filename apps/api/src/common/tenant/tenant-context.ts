import type { WorkspaceSummary } from '@onedata/contracts';
import type { Request } from 'express';
import type { RequestWithContext } from '../http/request-context.middleware';

export interface AuthenticatedIdentity {
  id: string;
  username: string;
  displayName: string;
  roles: string[];
  workspaces: WorkspaceSummary[];
}

export interface TenantContext {
  workspace: WorkspaceSummary;
  source: 'identity-default' | 'identity-selection';
}

/**
 * Tenant selection is derived from an authenticated identity. A raw tenant
 * header is never sufficient to grant access; the selected workspace must be
 * present in the identity's workspace list.
 */
export function tenantContextFromRequest(request: Request): TenantContext | null {
  const identity = (request as RequestWithContext).user as AuthenticatedIdentity | undefined;
  if (!identity || identity.workspaces.length === 0) {
    return null;
  }

  const requestedId = request.get('x-tenant-id');
  const selected = requestedId
    ? identity.workspaces.find((workspace) => workspace.id === requestedId)
    : identity.workspaces[0];

  return selected
    ? {
        workspace: selected,
        source: requestedId ? 'identity-selection' : 'identity-default',
      }
    : null;
}
