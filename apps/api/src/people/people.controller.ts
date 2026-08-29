import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import {
  EMPLOYEE_IDENTITY_MAPPING_MANAGE,
  EMPLOYEE_MASTER_DATA_SYNC,
  EMPLOYEE_PROFILE_READ,
} from '@onedata/contracts';
import type { CurrentUser } from '@onedata/contracts';
import type { Request } from 'express';
import { toApiEnvelope } from '../common/http/api-envelope';
import type { RequestWithContext } from '../common/http/request-context.middleware';
import { AuthGuard } from '../platform/auth/auth.guard';
import { PermissionGuard } from '../platform/auth/permission.guard';
import { RequirePermission } from '../platform/auth/permission.decorator';
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
  @UseGuards(AuthGuard, PermissionGuard)
  @RequirePermission(EMPLOYEE_PROFILE_READ)
  async list(@Req() request: Request) {
    const user = (request as RequestWithContext).user as CurrentUser;
    const items = await this.peopleService.listForUser(user);
    return toApiEnvelope({ items }, request);
  }

  @Get('identity-mappings/portal')
  @UseGuards(AuthGuard, PermissionGuard)
  @RequirePermission(EMPLOYEE_IDENTITY_MAPPING_MANAGE)
  async portalIdentityMappingReport(@Req() request: Request) {
    const user = (request as RequestWithContext).user as CurrentUser;
    return toApiEnvelope(await this.peopleService.portalIdentityMappingReport(user), request);
  }

  @Post('sync/special')
  @UseGuards(AuthGuard, PermissionGuard)
  @RequirePermission(EMPLOYEE_MASTER_DATA_SYNC)
  async syncFromSpecial(@Req() request: Request) {
    const user = (request as RequestWithContext).user as CurrentUser;
    return toApiEnvelope(await this.peopleSyncService.syncFromSpecial(user), request);
  }

  @Post('identity-mappings/portal')
  @UseGuards(AuthGuard, PermissionGuard)
  @RequirePermission(EMPLOYEE_IDENTITY_MAPPING_MANAGE)
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
