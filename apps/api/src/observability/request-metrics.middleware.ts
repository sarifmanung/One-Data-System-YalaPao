import { Injectable, type NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { OperationalMetricsService } from './operational-metrics.service';

@Injectable()
export class RequestMetricsMiddleware implements NestMiddleware {
  constructor(private readonly metrics: OperationalMetricsService) {}

  use(_request: Request, response: Response, next: NextFunction): void {
    response.once('finish', () => this.metrics.recordResponse(response.statusCode));
    next();
  }
}
