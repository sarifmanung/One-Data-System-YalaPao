import { Controller, Get, Req } from '@nestjs/common';
import type { Request } from 'express';
import { toApiEnvelope } from '../common/http/api-envelope';
import { PrismaService } from '../database/prisma.service';

type HealthStatus = 'ok' | 'degraded';

type HealthResponse = {
  status: HealthStatus;
  service: 'onedata-api';
  version: string;
  targetStack: {
    api: 'NestJS';
    web: 'Next.js';
  };
  checks?: {
    database: 'connected' | 'not_configured' | 'unavailable';
  };
  ready?: boolean;
};

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('live')
  live(@Req() request: Request) {
    const response: HealthResponse = {
      status: 'ok',
      service: 'onedata-api',
      version: process.env.APP_VERSION ?? '0.1.0',
      targetStack: { api: 'NestJS', web: 'Next.js' },
    };

    return toApiEnvelope(response, request);
  }

  @Get('ready')
  async ready(@Req() request: Request) {
    let database: NonNullable<HealthResponse['checks']>['database'] = 'not_configured';
    let ready = false;

    if (this.prisma.isDatabaseConfigured()) {
      try {
        await this.prisma.$queryRaw`SELECT 1`;
        database = 'connected';
        ready = true;
      } catch {
        database = 'unavailable';
      }
    }

    const response: HealthResponse = {
      status: ready ? 'ok' : 'degraded',
      service: 'onedata-api',
      version: process.env.APP_VERSION ?? '0.1.0',
      targetStack: { api: 'NestJS', web: 'Next.js' },
      checks: { database },
      ready,
    };

    return toApiEnvelope(response, request);
  }
}
