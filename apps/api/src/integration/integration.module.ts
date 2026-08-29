import { Module } from '@nestjs/common';
import { PlatformModule } from '../platform/platform.module';
import { LeaveSnapshotController } from './leave-snapshot.controller';
import { LeaveSnapshotService } from './leave-snapshot.service';
import { SpecialLeaveSnapshotClient } from './special-leave-snapshot.client';

@Module({
  imports: [PlatformModule],
  controllers: [LeaveSnapshotController],
  providers: [LeaveSnapshotService, SpecialLeaveSnapshotClient],
})
export class IntegrationModule {}
