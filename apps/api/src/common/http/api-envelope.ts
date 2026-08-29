import type { ApiEnvelope } from '@onedata/contracts';
import type { Request } from 'express';
import { requestIdFrom } from './request-context.middleware';

export function toApiEnvelope<T>(data: T, request: Request): ApiEnvelope<T> {
  return {
    data,
    requestId: requestIdFrom(request),
  };
}
