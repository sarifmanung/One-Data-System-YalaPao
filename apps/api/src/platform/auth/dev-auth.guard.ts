import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import type { CurrentUser, WorkspaceSummary } from '@onedata/contracts';
import type { RequestWithContext } from '../../common/http/request-context.middleware';
import { permissionsFromPortalClaims } from './permissions';

@Injectable()
export class DevAuthGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithContext>();
    if (!this.tryAttach(request)) {
      throw new UnauthorizedException('Authentication is required.');
    }

    return true;
  }

  tryAttach(request: RequestWithContext): boolean {
    const enabled = this.config.get<string>('ONEDATA_DEV_AUTH_ENABLED', 'false') === 'true';
    const environment = this.config.get<string>('NODE_ENV', process.env.NODE_ENV ?? 'development');

    if (!enabled || environment === 'production') {
      return false;
    }

    const role = this.config.get<string>('ONEDATA_DEV_ROLE', 'DEVELOPMENT_ONLY');
    const configuredPermissions = (this.config.get<string>('ONEDATA_DEV_PERMISSIONS') ?? '')
      .split(',')
      .map((permission) => permission.trim())
      .filter(Boolean);
    const permissions = configuredPermissions.length > 0
      ? configuredPermissions
      : permissionsFromPortalClaims({ roles: [role] });

    const workspaceKind = this.config.get<string>('ONEDATA_DEV_WORKSPACE_KIND', 'tenant') === 'affiliation'
      ? 'affiliation'
      : 'tenant';
    const workspace: WorkspaceSummary = {
      id: this.config.get<string>(
        'ONEDATA_DEV_WORKSPACE_ID',
        workspaceKind === 'affiliation' ? 'affiliation-dev' : 'tenant-dev',
      ),
      kind: workspaceKind,
      code: this.config.get<string>(
        'ONEDATA_DEV_WORKSPACE_CODE',
        workspaceKind === 'affiliation' ? 'DEV-AFFILIATION' : 'DEV-TENANT',
      ),
      name: this.config.get<string>(
        'ONEDATA_DEV_WORKSPACE_NAME',
        workspaceKind === 'affiliation' ? 'One Data Development Affiliation' : 'Development Health Center',
      ),
      role: 'DEVELOPMENT_ONLY',
    };

    const user: CurrentUser = {
      id: this.config.get<string>('ONEDATA_DEV_USER_ID', 'dev-user'),
      username: this.config.get<string>('ONEDATA_DEV_USERNAME', 'developer'),
      displayName: this.config.get<string>('ONEDATA_DEV_DISPLAY_NAME', 'Local Developer'),
      roles: [role],
      permissions,
      workspaces: [workspace],
    };

    const employeeId = this.config.get<string>('ONEDATA_DEV_EMPLOYEE_ID');
    if (employeeId) {
      user.employeeId = employeeId;
    }

    request.user = user;
    return true;
  }
}
