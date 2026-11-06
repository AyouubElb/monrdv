import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import { messages, type ApiError } from '@repo/shared';
import type { Response } from 'express';

const DEFAULTS: Record<number, Omit<ApiError, 'statusCode'>> = {
  400: {
    code: 'validation_failed',
    message: messages.request.validationFailed,
  },
  401: { code: 'unauthenticated', message: messages.auth.unauthenticated },
  403: { code: 'forbidden', message: messages.request.forbidden },
  404: { code: 'not_found', message: messages.tenant.notFound },
  409: { code: 'conflict', message: messages.request.conflict },
  429: { code: 'too_many_requests', message: messages.request.tooManyRequests },
  500: { code: 'internal_error', message: messages.request.internalError },
  503: { code: 'service_unavailable', message: messages.request.unavailable },
};

// Every error leaves as `ApiError`, including ones Nest or a library threw.
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const error = toApiError(exception);
    if (error.statusCode >= 500) {
      this.logger.error({ err: exception }, 'Request failed');
    }
    host
      .switchToHttp()
      .getResponse<Response>()
      .status(error.statusCode)
      .json(error);
  }
}

function toApiError(exception: unknown): ApiError {
  if (exception instanceof HttpException) {
    const statusCode = exception.getStatus();
    const body = exception.getResponse();
    // Ours carry a code: new ConflictException({ code, message })
    if (typeof body === 'object' && 'code' in body && 'message' in body) {
      return {
        statusCode,
        code: String(body.code),
        message: String(body.message),
      };
    }
    return withDefaults(statusCode);
  }
  if (exception instanceof PrismaClientKnownRequestError) {
    if (exception.code === 'P2002') return withDefaults(409);
    if (exception.code === 'P2025') return withDefaults(404);
  }
  return withDefaults(500);
}

function withDefaults(statusCode: number): ApiError {
  return {
    statusCode,
    ...(DEFAULTS[statusCode] ?? {
      code: `http_${statusCode}`,
      message: messages.request.forbidden,
    }),
  };
}
