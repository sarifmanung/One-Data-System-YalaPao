import { BadGatewayException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  SpecialLeaveSnapshotClient,
  SpecialLeaveSnapshotError,
  type SpecialLeaveSnapshotPayload,
} from './special-leave-snapshot.client';

const payload: SpecialLeaveSnapshotPayload = {
  contract_version: '1.0',
  period: '2026-08',
  period_year: 2026,
  period_month: 8,
  snapshot_version: 1,
  idempotency_key: 'leave-snapshot:affiliation-1:2026-08:' + 'a'.repeat(64),
  source_cutoff: '2026-08-29T08:00:00.000Z',
  source_hash: 'a'.repeat(64),
  employees: [],
};

function response(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn().mockResolvedValue(body),
  } as unknown as Response;
}

function upstreamBody(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    data: {
      status: 'applied',
      periodId: 'special-period-1',
      period: '2026-08',
      snapshotVersion: 1,
      processedEmployees: 0,
      processedLeaveEntries: 0,
      ...overrides,
    },
  };
}

describe('SpecialLeaveSnapshotClient', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('sends the versioned snapshot to the upstream internal endpoint', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(response(upstreamBody()));
    const client = new SpecialLeaveSnapshotClient(new ConfigService({
      SPECIAL_ALLOWANCES_BASE_URL: 'http://special.test/',
      SPECIAL_ALLOWANCES_INTEGRATION_TOKEN: 'test-token',
      SPECIAL_ALLOWANCES_LEAVE_CONTRACT_VERSION: '1.0',
    }));

    await expect(client.send(payload)).resolves.toMatchObject({ status: 'applied' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toBe(
      'http://special.test/internal/api/v1/periods/2026-08/leave-snapshot',
    );
    expect(fetchMock.mock.calls[0][1]).toMatchObject({
      method: 'POST',
      body: JSON.stringify(payload),
      headers: expect.objectContaining({
        authorization: 'Bearer test-token',
        'idempotency-key': payload.idempotency_key,
      }),
    });
  });

  it.each([408, 429, 500, 502, 503, 504])(
    'marks upstream HTTP %s as retryable',
    async (status) => {
      const client = new SpecialLeaveSnapshotClient(new ConfigService({
        SPECIAL_ALLOWANCES_BASE_URL: 'http://special.test',
        SPECIAL_ALLOWANCES_INTEGRATION_TOKEN: 'test-token',
      }));
      jest.spyOn(global, 'fetch').mockResolvedValueOnce(response({ message: 'transient failure' }, status));

      await expect(client.send(payload)).rejects.toMatchObject({
        httpStatus: status,
        retryable: true,
      } satisfies Partial<SpecialLeaveSnapshotError>);
    },
  );

  it.each([400, 401, 403, 404, 409, 422])(
    'marks upstream HTTP %s as non-retryable',
    async (status) => {
      const client = new SpecialLeaveSnapshotClient(new ConfigService({
        SPECIAL_ALLOWANCES_BASE_URL: 'http://special.test',
        SPECIAL_ALLOWANCES_INTEGRATION_TOKEN: 'test-token',
      }));
      jest.spyOn(global, 'fetch').mockResolvedValueOnce(response({ message: 'contract rejection' }, status));

      await expect(client.send(payload)).rejects.toMatchObject({
        httpStatus: status,
        retryable: false,
      } satisfies Partial<SpecialLeaveSnapshotError>);
    },
  );

  it('marks a network or timeout failure as retryable without exposing transport details', async () => {
    const client = new SpecialLeaveSnapshotClient(new ConfigService({
      SPECIAL_ALLOWANCES_BASE_URL: 'http://special.test',
      SPECIAL_ALLOWANCES_INTEGRATION_TOKEN: 'test-token',
    }));

    jest.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('socket details must not escape'));
    await expect(client.send(payload)).rejects.toMatchObject({
      message: 'Special-Allowances leave snapshot endpoint is unreachable.',
      httpStatus: null,
      retryable: true,
    } satisfies Partial<SpecialLeaveSnapshotError>);
  });

  it.each([
    ['missing data envelope', {}],
    ['invalid status', upstreamBody({ status: 'pending' })],
    ['blank period id', upstreamBody({ periodId: '   ' })],
    ['invalid month', upstreamBody({ period: '2026-13' })],
    ['missing snapshot version', upstreamBody({ snapshotVersion: undefined })],
    ['non-integer snapshot version', upstreamBody({ snapshotVersion: 1.5 })],
    ['zero snapshot version', upstreamBody({ snapshotVersion: 0 })],
    ['negative employee count', upstreamBody({ processedEmployees: -1 })],
    ['fractional leave-entry count', upstreamBody({ processedLeaveEntries: 0.5 })],
  ])('rejects malformed successful response: %s', async (_scenario, body) => {
    const client = new SpecialLeaveSnapshotClient(new ConfigService({
      SPECIAL_ALLOWANCES_BASE_URL: 'http://special.test',
      SPECIAL_ALLOWANCES_INTEGRATION_TOKEN: 'test-token',
    }));
    jest.spyOn(global, 'fetch').mockResolvedValueOnce(response(body));

    await expect(client.send(payload)).rejects.toThrow(BadGatewayException);
  });

  it('fails closed when the integration credential is missing', async () => {
    const client = new SpecialLeaveSnapshotClient(new ConfigService({}));

    await expect(client.send(payload)).rejects.toThrow(ServiceUnavailableException);
  });
});
