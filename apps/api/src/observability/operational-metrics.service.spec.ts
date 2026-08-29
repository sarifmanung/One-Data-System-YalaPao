import { OperationalMetricsService } from './operational-metrics.service';

describe('OperationalMetricsService', () => {
  it('keeps only aggregate status counters without path, identity or payload data', () => {
    const service = new OperationalMetricsService();
    service.recordResponse(200);
    service.recordResponse(401);
    service.recordResponse(500);

    expect(service.snapshot()).toMatchObject({
      service: 'onedata-api',
      requestsTotal: 3,
      responsesByClass: { '2xx': 1, '4xx': 1, '5xx': 1 },
    });
    expect(JSON.stringify(service.snapshot())).not.toContain('password');
  });
});
