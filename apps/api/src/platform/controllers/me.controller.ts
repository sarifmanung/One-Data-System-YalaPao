import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import type { CurrentUser } from '@onedata/contracts';
import type { Request } from 'express';
import { toApiEnvelope } from '../../common/http/api-envelope';
import type { RequestWithContext } from '../../common/http/request-context.middleware';
import { DevAuthGuard } from '../auth/dev-auth.guard';

@Controller('v1')
export class MeController {
  @Get('me')
  @UseGuards(DevAuthGuard)
  me(@Req() request: Request) {
    const user = (request as RequestWithContext).user as CurrentUser;
    return toApiEnvelope(user, request);
  }
}
