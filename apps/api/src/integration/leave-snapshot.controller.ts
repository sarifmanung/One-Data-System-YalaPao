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
  LEAVE_SNAPSHOT_MANAGE,
  LEAVE_SNAPSHOT_SCHEDULE_MANAGE,
} from '@onedata/contracts';
import type { CurrentUser } from '@onedata/contracts';
import type { Request } from 'express';
import { toApiEnvelope } from '../common/http/api-envelope';
import { tenantContextFromRequest } from '../common/tenant/tenant-context';
import type { RequestWithContext } from '../common/http/request-context.middleware';
import { AuthGuard } from '../platform/auth/auth.guard';
import { PermissionGuard } from '../platform/auth/permission.guard';
import { RequirePermission } from '../platform/auth/permission.decorator';
import { PrepareLeaveSnapshotDto } from './dto/prepare-leave-snapshot.dto';
import { UpsertLeaveSnapshotScheduleDto } from './dto/upsert-leave-snapshot-schedule.dto';
import { LeaveSnapshotService } from './leave-snapshot.service';
import { LeaveSnapshotScheduleService } from './leave-snapshot-schedule.service';

@Controller('v1/integrations/special/leave-snapshots')
@UseGuards(AuthGuard)
export class LeaveSnapshotController {
  constructor(
    private readonly snapshots: LeaveSnapshotService,
    private readonly schedules: LeaveSnapshotScheduleService,
  ) {}

  @Get()
  @UseGuards(PermissionGuard)
  @RequirePermission(LEAVE_SNAPSHOT_MANAGE)
  async list(@Req() request: Request) {
    const context = tenantContextFromRequest(request);
    if (!context) {
      throw new BadRequestException('A valid affiliation workspace must be selected.');
    }
    return toApiEnvelope(
      { items: await this.snapshots.list(this.userFrom(request), context) },
      request,
    );
  }

  @Post('prepare')
  @UseGuards(PermissionGuard)
  @RequirePermission(LEAVE_SNAPSHOT_MANAGE)
  async prepare(
    @Req() request: Request,
    @Body() input: PrepareLeaveSnapshotDto,
  ) {
    const context = tenantContextFromRequest(request);
    if (!context) {
      throw new BadRequestException('A valid affiliation workspace must be selected.');
    }
    return toApiEnvelope(
      await this.snapshots.prepare(this.userFrom(request), context, input),
      request,
    );
  }

  @Post(':id/deliver')
  @UseGuards(PermissionGuard)
  @RequirePermission(LEAVE_SNAPSHOT_MANAGE)
  async deliver(@Req() request: Request, @Param('id') id: string) {
    const context = tenantContextFromRequest(request);
    if (!context) {
      throw new BadRequestException('A valid affiliation workspace must be selected.');
    }
    return toApiEnvelope(
      await this.snapshots.deliver(this.userFrom(request), context, id),
      request,
    );
  }

  @Get('schedules')
  @UseGuards(PermissionGuard)
  @RequirePermission(LEAVE_SNAPSHOT_SCHEDULE_MANAGE)
  async listSchedules(@Req() request: Request) {
    const context = tenantContextFromRequest(request);
    if (!context) {
      throw new BadRequestException('A valid affiliation workspace must be selected.');
    }
    return toApiEnvelope(
      { items: await this.schedules.list(this.userFrom(request), context) },
      request,
    );
  }

  @Post('schedules')
  @UseGuards(PermissionGuard)
  @RequirePermission(LEAVE_SNAPSHOT_SCHEDULE_MANAGE)
  async upsertSchedule(
    @Req() request: Request,
    @Body() input: UpsertLeaveSnapshotScheduleDto,
  ) {
    const context = tenantContextFromRequest(request);
    if (!context) {
      throw new BadRequestException('A valid affiliation workspace must be selected.');
    }
    return toApiEnvelope(
      await this.schedules.upsertDraft(this.userFrom(request), context, input),
      request,
    );
  }

  @Post('schedules/:id/approve')
  @UseGuards(PermissionGuard)
  @RequirePermission(LEAVE_SNAPSHOT_SCHEDULE_MANAGE)
  async approveSchedule(@Req() request: Request, @Param('id') id: string) {
    const context = tenantContextFromRequest(request);
    if (!context) {
      throw new BadRequestException('A valid affiliation workspace must be selected.');
    }
    return toApiEnvelope(
      await this.schedules.approve(this.userFrom(request), context, id),
      request,
    );
  }

  @Post('schedules/:id/pause')
  @UseGuards(PermissionGuard)
  @RequirePermission(LEAVE_SNAPSHOT_SCHEDULE_MANAGE)
  async pauseSchedule(@Req() request: Request, @Param('id') id: string) {
    const context = tenantContextFromRequest(request);
    if (!context) {
      throw new BadRequestException('A valid affiliation workspace must be selected.');
    }
    return toApiEnvelope(
      await this.schedules.pause(this.userFrom(request), context, id),
      request,
    );
  }

  @Get(':id')
  @UseGuards(PermissionGuard)
  @RequirePermission(LEAVE_SNAPSHOT_MANAGE)
  async get(@Req() request: Request, @Param('id') id: string) {
    const context = tenantContextFromRequest(request);
    if (!context) {
      throw new BadRequestException('A valid affiliation workspace must be selected.');
    }
    return toApiEnvelope(
      await this.snapshots.getBatch(this.userFrom(request), context, id),
      request,
    );
  }

  private userFrom(request: Request): CurrentUser {
    return (request as RequestWithContext).user as CurrentUser;
  }
}
