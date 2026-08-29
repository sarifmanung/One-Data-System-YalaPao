import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { CurrentUser, OneDataPermission } from '@onedata/contracts';
import type { RequestWithContext } from '../../common/http/request-context.middleware';
import { REQUIRED_PERMISSIONS_KEY } from './permission.decorator';
import { hasOneDataPermission } from './permissions';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<OneDataPermission[]>(
      REQUIRED_PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithContext>();
    const user = request.user as CurrentUser | undefined;
    if (!user) {
      throw new UnauthorizedException('Authentication is required.');
    }

    if (requiredPermissions.some((permission) => hasOneDataPermission(user, permission))) {
      return true;
    }

    throw new ForbiddenException('The account does not have the required One Data permission.');
  }
}
