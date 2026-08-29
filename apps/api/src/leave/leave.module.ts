import { Module } from '@nestjs/common';
import { PlatformModule } from '../platform/platform.module';
import { LeaveController } from './leave.controller';
import { LeaveService } from './leave.service';

@Module({
  imports: [PlatformModule],
  controllers: [LeaveController],
  providers: [LeaveService],
})
export class LeaveModule {}
