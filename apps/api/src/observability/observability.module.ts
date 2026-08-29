import { Module } from '@nestjs/common';
import { OperationalMetricsService } from './operational-metrics.service';
import { RequestMetricsMiddleware } from './request-metrics.middleware';

@Module({
  providers: [OperationalMetricsService, RequestMetricsMiddleware],
  exports: [OperationalMetricsService, RequestMetricsMiddleware],
})
export class ObservabilityModule {}
