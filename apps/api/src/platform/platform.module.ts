import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { AuditLogService } from '../common/audit/audit-log.service';
import { RequestContextMiddleware } from '../common/http/request-context.middleware';
import {
  CsrfOriginMiddleware,
  RateLimitMiddleware,
  SecurityHeadersMiddleware,
} from '../common/http/security.middleware';
import { ObservabilityModule } from '../observability/observability.module';
import { RequestMetricsMiddleware } from '../observability/request-metrics.middleware';
import { AuthGuard } from './auth/auth.guard';
import { AuthMaintenanceService } from './auth/auth-maintenance.service';
import { AuthSessionService } from './auth/auth-session.service';
import { DelegatedApproverService } from './auth/delegated-approver.service';
import { DevAuthGuard } from './auth/dev-auth.guard';
import { PermissionGuard } from './auth/permission.guard';
import { AuthController } from './controllers/auth.controller';
import { AuthorizationController } from './controllers/authorization.controller';
import { MeController } from './controllers/me.controller';
import { WorkspacesController } from './controllers/workspaces.controller';
import {
  InMemoryReplayGuard,
  PORTAL_REPLAY_GUARD,
  PrismaReplayGuard,
  PortalLaunchTokenService,
} from './sso/portal-launch-token.service';

@Module({
  imports: [ObservabilityModule],
  controllers: [AuthController, AuthorizationController, MeController, WorkspacesController],
  providers: [
    AuditLogService,
    AuthGuard,
    AuthMaintenanceService,
    AuthSessionService,
    DelegatedApproverService,
    DevAuthGuard,
    InMemoryReplayGuard,
    PrismaReplayGuard,
    { provide: PORTAL_REPLAY_GUARD, useExisting: PrismaReplayGuard },
    PermissionGuard,
    PortalLaunchTokenService,
    RequestContextMiddleware,
    CsrfOriginMiddleware,
    RateLimitMiddleware,
    SecurityHeadersMiddleware,
  ],
  exports: [
    AuditLogService,
    AuthGuard,
    AuthMaintenanceService,
    AuthSessionService,
    DelegatedApproverService,
    DevAuthGuard,
    PermissionGuard,
    PortalLaunchTokenService,
  ],
})
export class PlatformModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(RequestContextMiddleware)
      .forRoutes({ path: '{*path}', method: RequestMethod.ALL });
    consumer
      .apply(RequestMetricsMiddleware, SecurityHeadersMiddleware, CsrfOriginMiddleware, RateLimitMiddleware)
      .forRoutes({ path: '{*path}', method: RequestMethod.ALL });
  }
}
