import { Module } from '@nestjs/common';
import { IntegrationModule } from '../integration/integration.module';
import { LeaveSnapshotWorkerService } from './leave-snapshot-worker.service';

@Module({
  imports: [IntegrationModule],
  providers: [LeaveSnapshotWorkerService],
  exports: [LeaveSnapshotWorkerService],
})
export class WorkerModule {}
