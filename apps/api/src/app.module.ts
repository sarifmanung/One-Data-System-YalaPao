import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { LeaveModule } from './leave/leave.module';
import { PeopleModule } from './people/people.module';
import { PlatformModule } from './platform/platform.module';
import { SystemModule } from './system/system.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    HealthModule,
    PeopleModule,
    LeaveModule,
    PlatformModule,
    SystemModule,
  ],
})
export class AppModule {}
