import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { ProblemDetailsFilter } from '../src/common/http/problem-details.filter';

describe('One Data API foundation', () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.ONEDATA_DEV_AUTH_ENABLED = 'false';
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }));
    app.useGlobalFilters(new ProblemDetailsFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('exposes a live health envelope with a request id', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/health/live')
      .set('x-request-id', 'foundation-test-1')
      .expect(200);

    expect(response.headers['x-request-id']).toBe('foundation-test-1');
    expect(response.body).toMatchObject({
      data: {
        status: 'ok',
        service: 'onedata-api',
        targetStack: { api: 'NestJS', web: 'Next.js' },
      },
      requestId: 'foundation-test-1',
    });
  });

  it('advertises the target integration contract', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/system/contract')
      .expect(200);

    expect(response.body.data).toEqual({
      contractVersion: '1.4',
      leaveEffectiveStatus: 'PAPER_APPROVED',
      deprecatedLeaveStatuses: ['CONFIRMED'],
      targetStack: { api: 'NestJS', web: 'Next.js' },
    });
  });

  it('does not enable a fake identity by default', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/me')
      .expect(401);

    expect(response.body).toMatchObject({
      status: 401,
      detail: 'Authentication is required.',
    });
  });
});
