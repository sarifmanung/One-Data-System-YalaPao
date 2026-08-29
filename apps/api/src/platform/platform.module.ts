import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { AuditLogService } from '../common/audit/audit-log.service';
import { RequestContextMiddleware } from '../common/http/request-context.middleware';
import { AuthGuard } from './auth/auth.guard';
import { AuthSessionService } from './auth/auth-session.service';
import { DevAuthGuard } from './auth/dev-auth.guard';
import { AuthController } from './controllers/auth.controller';
import { MeController } from './controllers/me.controller';
import { WorkspacesController } from './controllers/workspaces.controller';
import {
  InMemoryReplayGuard,
  PortalLaunchTokenService,
} from './sso/portal-launch-token.service';

@Module({
  controllers: [AuthController, MeController, WorkspacesController],
  providers: [
    AuditLogService,
    AuthGuard,
    AuthSessionService,
    DevAuthGuard,
    InMemoryReplayGuard,
    PortalLaunchTokenService,
    RequestContextMiddleware,
  ],
  exports: [AuditLogService, AuthGuard, AuthSessionService, DevAuthGuard, PortalLaunchTokenService],
})
export class PlatformModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(RequestContextMiddleware)
      .forRoutes({ path: '{*path}', method: RequestMethod.ALL });
  }
}
