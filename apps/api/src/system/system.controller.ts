import { Controller, Get, Req } from '@nestjs/common';
import {
  API_CONTRACT_VERSION,
  EFFECTIVE_LEAVE_STATUS,
  type TargetContractMetadata,
} from '@onedata/contracts';
import type { Request } from 'express';
import { toApiEnvelope } from '../common/http/api-envelope';

@Controller('v1/system')
export class SystemController {
  @Get('contract')
  contract(@Req() request: Request) {
    const metadata: TargetContractMetadata = {
      contractVersion: API_CONTRACT_VERSION,
      leaveEffectiveStatus: EFFECTIVE_LEAVE_STATUS,
      deprecatedLeaveStatuses: ['CONFIRMED'],
      targetStack: { api: 'NestJS', web: 'Next.js' },
    };

    return toApiEnvelope(metadata, request);
  }
}
