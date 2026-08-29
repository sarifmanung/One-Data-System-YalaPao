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
import { LEAVE_SNAPSHOT_MANAGE } from '@onedata/contracts';
import type { CurrentUser } from '@onedata/contracts';
import type { Request } from 'express';
import { toApiEnvelope } from '../common/http/api-envelope';
import { tenantContextFromRequest } from '../common/tenant/tenant-context';
import type { RequestWithContext } from '../common/http/request-context.middleware';
import { AuthGuard } from '../platform/auth/auth.guard';
import { PermissionGuard } from '../platform/auth/permission.guard';
import { RequirePermission } from '../platform/auth/permission.decorator';
import { PrepareLeaveSnapshotDto } from './dto/prepare-leave-snapshot.dto';
import { LeaveSnapshotService } from './leave-snapshot.service';

@Controller('v1/integrations/special/leave-snapshots')
@UseGuards(AuthGuard)
export class LeaveSnapshotController {
  constructor(private readonly snapshots: LeaveSnapshotService) {}

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
