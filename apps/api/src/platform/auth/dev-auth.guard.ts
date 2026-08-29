import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import type { CurrentUser, WorkspaceSummary } from '@onedata/contracts';
import type { RequestWithContext } from '../../common/http/request-context.middleware';

@Injectable()
export class DevAuthGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const enabled = this.config.get<string>('ONEDATA_DEV_AUTH_ENABLED', 'false') === 'true';
    const environment = this.config.get<string>('NODE_ENV', process.env.NODE_ENV ?? 'development');

    if (!enabled || environment === 'production') {
      throw new UnauthorizedException('Authentication is required.');
    }

    const request = context.switchToHttp().getRequest<RequestWithContext>();
    const workspace: WorkspaceSummary = {
      id: this.config.get<string>('ONEDATA_DEV_WORKSPACE_ID', 'tenant-dev'),
      kind: 'tenant',
      code: this.config.get<string>('ONEDATA_DEV_WORKSPACE_CODE', 'DEV-TENANT'),
      name: this.config.get<string>('ONEDATA_DEV_WORKSPACE_NAME', 'Development Health Center'),
      role: 'DEVELOPMENT_ONLY',
    };

    const user: CurrentUser = {
      id: this.config.get<string>('ONEDATA_DEV_USER_ID', 'dev-user'),
      username: this.config.get<string>('ONEDATA_DEV_USERNAME', 'developer'),
      displayName: this.config.get<string>('ONEDATA_DEV_DISPLAY_NAME', 'Local Developer'),
      roles: [this.config.get<string>('ONEDATA_DEV_ROLE', 'DEVELOPMENT_ONLY')],
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
