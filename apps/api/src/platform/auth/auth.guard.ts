import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import type { RequestWithContext } from '../../common/http/request-context.middleware';
import { AuthSessionService } from './auth-session.service';
import { DevAuthGuard } from './dev-auth.guard';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly sessions: AuthSessionService,
    private readonly devAuth: DevAuthGuard,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithContext>();
    const sessionUser = await this.sessions.userFromRequest(request);
    if (sessionUser) {
      request.user = sessionUser;
      return true;
    }

    if (this.devAuth.tryAttach(request)) {
      return true;
    }

    throw new UnauthorizedException('Authentication is required.');
  }
}
