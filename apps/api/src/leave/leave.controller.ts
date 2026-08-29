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
import type { CurrentUser } from '@onedata/contracts';
import type { Request } from 'express';
import { toApiEnvelope } from '../common/http/api-envelope';
import { tenantContextFromRequest } from '../common/tenant/tenant-context';
import type { RequestWithContext } from '../common/http/request-context.middleware';
import { DevAuthGuard } from '../platform/auth/dev-auth.guard';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';
import { PaperResultDto } from './dto/paper-result.dto';
import { VoidLeaveDto } from './dto/void-leave.dto';
import { LeaveService } from './leave.service';

@Controller('v1/leave')
@UseGuards(DevAuthGuard)
export class LeaveController {
  constructor(private readonly leaveService: LeaveService) {}

  @Get('types')
  async types(@Req() request: Request) {
    return toApiEnvelope({ items: await this.leaveService.listTypes() }, request);
  }

  @Get('requests')
  async requests(@Req() request: Request) {
    const user = this.userFrom(request);
    return toApiEnvelope({ items: await this.leaveService.listRequests(user) }, request);
  }

  @Post('requests')
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
