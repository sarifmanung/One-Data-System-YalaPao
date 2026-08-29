import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AUTHORIZATION_DELEGATED_APPROVER_MANAGE } from '@onedata/contracts';
import type { CurrentUser } from '@onedata/contracts';
import type { Request } from 'express';
import { toApiEnvelope } from '../../common/http/api-envelope';
import type { RequestWithContext } from '../../common/http/request-context.middleware';
import { AuthGuard } from '../auth/auth.guard';
import { DelegatedApproverService } from '../auth/delegated-approver.service';
import { PermissionGuard } from '../auth/permission.guard';
import { RequirePermission } from '../auth/permission.decorator';
import { CreateDelegatedApproverDto } from '../dto/create-delegated-approver.dto';
import { RevokeDelegatedApproverDto } from '../dto/revoke-delegated-approver.dto';

@Controller('v1/authorization/delegated-approvers')
@UseGuards(AuthGuard, PermissionGuard)
@RequirePermission(AUTHORIZATION_DELEGATED_APPROVER_MANAGE)
export class AuthorizationController {
  constructor(private readonly delegatedApprovers: DelegatedApproverService) {}

  @Get()
  async list(@Req() request: Request) {
    return toApiEnvelope(await this.delegatedApprovers.list(this.userFrom(request)), request);
  }

  @Post()
  async create(@Req() request: Request, @Body() input: CreateDelegatedApproverDto) {
    return toApiEnvelope(
      await this.delegatedApprovers.create(this.userFrom(request), input),
      request,
    );
  }

  @Post(':id/revoke')
  async revoke(
    @Req() request: Request,
    @Param('id') id: string,
    @Body() input: RevokeDelegatedApproverDto,
  ) {
    return toApiEnvelope(
      await this.delegatedApprovers.revoke(this.userFrom(request), id, input.reason),
      request,
    );
  }

  private userFrom(request: Request): CurrentUser {
    return (request as RequestWithContext).user as CurrentUser;
  }
}
