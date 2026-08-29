import { ServiceUnavailableException } from '@nestjs/common';
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

describe('SpecialLeaveSnapshotClient', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('sends the versioned snapshot to the upstream internal endpoint', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(response({
      data: {
        status: 'applied',
        periodId: 'special-period-1',
        period: '2026-08',
        snapshotVersion: 1,
        processedEmployees: 0,
        processedLeaveEntries: 0,
      },
    }));
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

  it('marks upstream 5xx as retryable and 4xx as non-retryable', async () => {
    const client = new SpecialLeaveSnapshotClient(new ConfigService({
      SPECIAL_ALLOWANCES_BASE_URL: 'http://special.test',
      SPECIAL_ALLOWANCES_INTEGRATION_TOKEN: 'test-token',
    }));
    jest.spyOn(global, 'fetch').mockResolvedValueOnce(response({ message: 'busy' }, 503));
    await expect(client.send(payload)).rejects.toMatchObject({
      httpStatus: 503,
      retryable: true,
    } satisfies Partial<SpecialLeaveSnapshotError>);

    jest.spyOn(global, 'fetch').mockResolvedValueOnce(response({ message: 'invalid' }, 422));
    await expect(client.send(payload)).rejects.toMatchObject({
      httpStatus: 422,
      retryable: false,
    } satisfies Partial<SpecialLeaveSnapshotError>);
  });

  it('fails closed when the integration credential is missing', async () => {
    const client = new SpecialLeaveSnapshotClient(new ConfigService({}));

    await expect(client.send(payload)).rejects.toThrow(ServiceUnavailableException);
  });
});
