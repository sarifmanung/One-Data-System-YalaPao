import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import type { CurrentUser } from '@onedata/contracts';
import type { Request } from 'express';
import { toApiEnvelope } from '../common/http/api-envelope';
import type { RequestWithContext } from '../common/http/request-context.middleware';
import { AuthGuard } from '../platform/auth/auth.guard';
import { MapPortalIdentityDto } from './dto/map-portal-identity.dto';
import { PeopleService } from './people.service';
import { PeopleSyncService } from './people-sync.service';

@Controller('v1/people')
export class PeopleController {
  constructor(
    private readonly peopleService: PeopleService,
    private readonly peopleSyncService: PeopleSyncService,
  ) {}

  @Get()
  @UseGuards(AuthGuard)
  async list(@Req() request: Request) {
    const user = (request as RequestWithContext).user as CurrentUser;
    const items = await this.peopleService.listForUser(user);
    return toApiEnvelope({ items }, request);
  }

  @Post('sync/special')
  @UseGuards(AuthGuard)
  async syncFromSpecial(@Req() request: Request) {
    const user = (request as RequestWithContext).user as CurrentUser;
    return toApiEnvelope(await this.peopleSyncService.syncFromSpecial(user), request);
  }

  @Post('identity-mappings/portal')
  @UseGuards(AuthGuard)
  async mapPortalIdentity(
    @Req() request: Request,
    @Body() input: MapPortalIdentityDto,
  ) {
    const user = (request as RequestWithContext).user as CurrentUser;
    return toApiEnvelope(
      await this.peopleService.mapPortalIdentity(user, input.externalSubject, input.employeeId),
      request,
    );
  }
}
