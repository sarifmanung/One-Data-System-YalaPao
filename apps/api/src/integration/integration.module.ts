import { Module } from '@nestjs/common';
import { PlatformModule } from '../platform/platform.module';
import { LeaveSnapshotController } from './leave-snapshot.controller';
import { LeaveSnapshotService } from './leave-snapshot.service';
import { LeaveSnapshotScheduleService } from './leave-snapshot-schedule.service';
import { SpecialLeaveSnapshotClient } from './special-leave-snapshot.client';

@Module({
  imports: [PlatformModule],
  controllers: [LeaveSnapshotController],
  providers: [LeaveSnapshotService, LeaveSnapshotScheduleService, SpecialLeaveSnapshotClient],
  exports: [LeaveSnapshotService, LeaveSnapshotScheduleService, SpecialLeaveSnapshotClient],
})
export class IntegrationModule {}
