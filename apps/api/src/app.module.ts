import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnvironment } from './config/env.validation';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { IntegrationModule } from './integration/integration.module';
import { LeaveModule } from './leave/leave.module';
import { PeopleModule } from './people/people.module';
import { PlatformModule } from './platform/platform.module';
import { ObservabilityModule } from './observability/observability.module';
import { SystemModule } from './system/system.module';
import { WorkerModule } from './worker/worker.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnvironment }),
    DatabaseModule,
    HealthModule,
    IntegrationModule,
    PeopleModule,
    LeaveModule,
    ObservabilityModule,
    PlatformModule,
    SystemModule,
    WorkerModule,
  ],
})
export class AppModule {}
