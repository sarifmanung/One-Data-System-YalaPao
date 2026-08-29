import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import type { ProblemDetails } from '@onedata/contracts';
import { requestIdFrom } from './request-context.middleware';

type ExceptionBody = {
  code?: unknown;
  detail?: unknown;
  message?: unknown;
  fields?: unknown;
};

function asExceptionBody(value: unknown): ExceptionBody {
  return typeof value === 'object' && value !== null ? value as ExceptionBody : {};
}

function validationFields(value: unknown): Array<{ field: string; message: string }> {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (typeof item === 'string') {
      return [{ field: '_', message: item }];
    }

    if (typeof item === 'object' && item !== null && 'field' in item && 'message' in item) {
      const field = (item as { field?: unknown }).field;
      const message = (item as { message?: unknown }).message;
      if (typeof field === 'string' && typeof message === 'string') {
        return [{ field, message }];
      }
    }

    return [];
  });
}

@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const requestId = requestIdFrom(request);

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let body: ExceptionBody = {};

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      body = asExceptionBody(exception.getResponse());
    }

    const code = typeof body.code === 'string'
      ? body.code
      : status === HttpStatus.BAD_REQUEST
        ? 'VALIDATION_ERROR'
        : status >= 500
          ? 'INTERNAL_ERROR'
          : `HTTP_${status}`;

    const defaultDetail = status >= 500 ? 'The request could not be processed.' : 'The request was rejected.';
    const message = typeof body.message === 'string'
      ? body.message
      : Array.isArray(body.message)
        ? body.message.filter((item): item is string => typeof item === 'string').join('; ')
        : undefined;

    const problem: ProblemDetails = {
      type: `/problems/${code.toLowerCase()}`,
      title: HttpStatus[status] ?? 'Request Error',
      status,
      code,
      detail: typeof body.detail === 'string' ? body.detail : message ?? defaultDetail,
      fields: validationFields(body.fields ?? body.message),
      requestId,
    };

    response.status(status).json(problem);
  }
}
