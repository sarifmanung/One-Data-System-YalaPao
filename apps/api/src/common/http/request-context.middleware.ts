import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

export type RequestWithContext = Request & {
  requestId?: string;
  user?: unknown;
};

const REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{1,100}$/;

export function requestIdFrom(request: Request): string {
  return (request as RequestWithContext).requestId ?? request.get('x-request-id') ?? 'unknown';
}

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  use(request: RequestWithContext, response: Response, next: NextFunction): void {
    const suppliedRequestId = request.get('x-request-id');
    const requestId = suppliedRequestId && REQUEST_ID_PATTERN.test(suppliedRequestId)
      ? suppliedRequestId
      : randomUUID();

    request.requestId = requestId;
    response.setHeader('x-request-id', requestId);
    next();
  }
}
