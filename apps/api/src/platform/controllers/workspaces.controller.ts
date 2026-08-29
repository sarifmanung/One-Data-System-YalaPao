import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import type { CurrentUser } from '@onedata/contracts';
import type { Request } from 'express';
import { toApiEnvelope } from '../../common/http/api-envelope';
import type { RequestWithContext } from '../../common/http/request-context.middleware';
import { AuthGuard } from '../auth/auth.guard';

@Controller('v1/workspaces')
export class WorkspacesController {
  @Get()
  @UseGuards(AuthGuard)
  list(@Req() request: Request) {
    const user = (request as RequestWithContext).user as CurrentUser;
    return toApiEnvelope(user.workspaces, request);
  }
}
