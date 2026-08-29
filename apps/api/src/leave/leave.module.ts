import { Module } from '@nestjs/common';
import { PlatformModule } from '../platform/platform.module';
import { LeaveController } from './leave.controller';
import { LeavePolicyService } from './leave-policy.service';
import { LeaveRulesService } from './leave-rules.service';
import { LeaveService } from './leave.service';

@Module({
  imports: [PlatformModule],
  controllers: [LeaveController],
  providers: [LeavePolicyService, LeaveRulesService, LeaveService],
})
export class LeaveModule {}
