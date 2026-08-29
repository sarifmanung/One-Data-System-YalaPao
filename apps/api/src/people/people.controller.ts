import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import type { CurrentUser } from '@onedata/contracts';
import type { Request } from 'express';
import { toApiEnvelope } from '../common/http/api-envelope';
import type { RequestWithContext } from '../common/http/request-context.middleware';
import { AuthGuard } from '../platform/auth/auth.guard';
import { PeopleService } from './people.service';

@Controller('v1/people')
export class PeopleController {
  constructor(private readonly peopleService: PeopleService) {}

  @Get()
  @UseGuards(AuthGuard)
  async list(@Req() request: Request) {
    const user = (request as RequestWithContext).user as CurrentUser;
    const items = await this.peopleService.listForUser(user);
    return toApiEnvelope({ items }, request);
  }
}
