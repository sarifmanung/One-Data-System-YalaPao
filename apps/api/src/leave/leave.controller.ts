import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  LEAVE_PAPER_DECISION_RECORD,
  LEAVE_REQUEST_CANCEL,
  LEAVE_REQUEST_CREATE,
  LEAVE_REQUEST_READ,
  LEAVE_REQUEST_SUBMIT,
  LEAVE_REQUEST_VOID,
  LEAVE_POLICY_MANAGE,
} from '@onedata/contracts';
import type { CurrentUser } from '@onedata/contracts';
import type { Request } from 'express';
import { toApiEnvelope } from '../common/http/api-envelope';
import { tenantContextFromRequest } from '../common/tenant/tenant-context';
import type { RequestWithContext } from '../common/http/request-context.middleware';
import { AuthGuard } from '../platform/auth/auth.guard';
import { PermissionGuard } from '../platform/auth/permission.guard';
import { RequirePermission } from '../platform/auth/permission.decorator';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';
import { PaperResultDto } from './dto/paper-result.dto';
import { VoidLeaveDto } from './dto/void-leave.dto';
import { CreateLeavePolicyDto } from './dto/create-leave-policy.dto';
import { PublishLeavePolicyDto } from './dto/publish-leave-policy.dto';
import { LeavePolicyService } from './leave-policy.service';
import { LeaveService } from './leave.service';

@Controller('v1/leave')
@UseGuards(AuthGuard)
export class LeaveController {
  constructor(
    private readonly leaveService: LeaveService,
    private readonly leavePolicyService: LeavePolicyService,
  ) {}

  @Get('policies')
  @UseGuards(PermissionGuard)
  @RequirePermission(LEAVE_POLICY_MANAGE)
  async policies(@Req() request: Request) {
    return toApiEnvelope(await this.leavePolicyService.list(this.userFrom(request)), request);
  }

  @Post('policies')
  @UseGuards(PermissionGuard)
  @RequirePermission(LEAVE_POLICY_MANAGE)
  async createPolicy(@Req() request: Request, @Body() input: CreateLeavePolicyDto) {
    return toApiEnvelope(
      await this.leavePolicyService.createDraft(this.userFrom(request), input),
      request,
    );
  }

  @Post('policies/:id/publish')
  @UseGuards(PermissionGuard)
  @RequirePermission(LEAVE_POLICY_MANAGE)
  async publishPolicy(
    @Req() request: Request,
    @Param('id') id: string,
    @Body() input: PublishLeavePolicyDto,
  ) {
    return toApiEnvelope(
      await this.leavePolicyService.publish(this.userFrom(request), id, input.approvalReference),
      request,
    );
  }

  @Get('types')
  @UseGuards(PermissionGuard)
  @RequirePermission(LEAVE_REQUEST_READ)
  async types(@Req() request: Request) {
    return toApiEnvelope({ items: await this.leaveService.listTypes() }, request);
  }

  @Get('requests')
  @UseGuards(PermissionGuard)
  @RequirePermission(LEAVE_REQUEST_READ)
  async requests(@Req() request: Request) {
    const user = this.userFrom(request);
    return toApiEnvelope({ items: await this.leaveService.listRequests(user) }, request);
  }

  @Post('requests')
  @UseGuards(PermissionGuard)
  @RequirePermission(LEAVE_REQUEST_CREATE)
  async create(
    @Req() request: Request,
    @Body() input: CreateLeaveRequestDto,
  ) {
    const context = tenantContextFromRequest(request);
    if (!context) {
      throw new BadRequestException('A valid tenant workspace must be selected.');
    }

    return toApiEnvelope(
      await this.leaveService.createDraft(this.userFrom(request), context, input),
      request,
    );
  }

  @Post('requests/:id/submit')
  @UseGuards(PermissionGuard)
  @RequirePermission(LEAVE_REQUEST_SUBMIT)
  async submit(@Req() request: Request, @Param('id') id: string) {
    return toApiEnvelope(await this.leaveService.submit(id, this.userFrom(request)), request);
  }

  @Post('requests/:id/paper-result')
  async paperResult(
    @Req() request: Request,
    @Param('id') id: string,
    @Body() input: PaperResultDto,
  ) {
    return toApiEnvelope(
      await this.leaveService.recordPaperResult(id, this.userFrom(request), input),
      request,
    );
  }

  @Post('requests/:id/cancel')
  @UseGuards(PermissionGuard)
  @RequirePermission(LEAVE_REQUEST_CANCEL)
  async cancel(@Req() request: Request, @Param('id') id: string) {
    return toApiEnvelope(await this.leaveService.cancel(id, this.userFrom(request)), request);
  }

  @Post('requests/:id/void')
  async void(
    @Req() request: Request,
    @Param('id') id: string,
    @Body() input: VoidLeaveDto,
  ) {
    return toApiEnvelope(
      await this.leaveService.void(id, this.userFrom(request), input),
      request,
    );
  }

  private userFrom(request: Request): CurrentUser {
    return (request as RequestWithContext).user as CurrentUser;
  }
}
