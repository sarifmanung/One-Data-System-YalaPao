import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { AuditLogService } from '../common/audit/audit-log.service';
import { RequestContextMiddleware } from '../common/http/request-context.middleware';
import { MeController } from './controllers/me.controller';
import { WorkspacesController } from './controllers/workspaces.controller';
import { DevAuthGuard } from './auth/dev-auth.guard';
import {
  InMemoryReplayGuard,
  PortalLaunchTokenService,
} from './sso/portal-launch-token.service';

@Module({
  controllers: [MeController, WorkspacesController],
  providers: [
    AuditLogService,
    DevAuthGuard,
    InMemoryReplayGuard,
    PortalLaunchTokenService,
    RequestContextMiddleware,
  ],
  exports: [AuditLogService, PortalLaunchTokenService],
})
export class PlatformModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(RequestContextMiddleware)
      .forRoutes({ path: '{*path}', method: RequestMethod.ALL });
  }
}
