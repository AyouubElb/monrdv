import {
  type ArgumentsHost,
  BadRequestException,
  ConflictException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import { messages } from '@repo/shared';
import { ApiExceptionFilter } from './api-exception.filter.js';

describe('ApiExceptionFilter', () => {
  /** Runs the filter and returns the status and JSON body it sent. */
  function send(exception: unknown): { status: number; body: unknown } {
    const res = {
      status: vi.fn<(code: number) => unknown>(),
      json: vi.fn<(body: unknown) => unknown>(),
    };
    res.status.mockReturnValue(res);
    const host = {
      switchToHttp: () => ({ getResponse: () => res }),
    } as unknown as ArgumentsHost;

    new ApiExceptionFilter().catch(exception, host);

    return {
      status: res.status.mock.calls[0][0],
      body: res.json.mock.calls[0][0],
    };
  }

  function prismaError(code: string): PrismaClientKnownRequestError {
    return new PrismaClientKnownRequestError('database said no', {
      code,
      clientVersion: '7.10.1',
    });
  }

  beforeEach(() => {
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('keeps the code and message of our own errors', () => {
    const result = send(
      new ConflictException({
        code: 'subdomain_taken',
        message: messages.subdomain.taken,
      }),
    );

    expect(result).toEqual({
      status: 409,
      body: {
        statusCode: 409,
        code: 'subdomain_taken',
        message: 'Cette adresse est déjà prise.',
      },
    });
  });

  it('gives a plain Nest error the default code and French message of its status', () => {
    expect(send(new NotFoundException()).body).toEqual({
      statusCode: 404,
      code: 'not_found',
      message: 'Page introuvable.',
    });
  });

  it('turns a Nest validation error without a code into validation_failed', () => {
    expect(
      send(new BadRequestException(['email must be an email'])).body,
    ).toEqual({
      statusCode: 400,
      code: 'validation_failed',
      message: messages.request.validationFailed,
    });
  });

  it.each([
    ['P2002', 409, 'conflict'],
    ['P2025', 404, 'not_found'],
  ])('maps the database error %s to %i %s', (prismaCode, status, code) => {
    expect(send(prismaError(prismaCode)).body).toMatchObject({
      statusCode: status,
      code,
    });
  });

  it('answers an unexpected crash with a generic 500 that leaks nothing', () => {
    const result = send(
      new Error('connect ECONNREFUSED 10.0.0.5:5432 password=hunter2'),
    );

    expect(result).toEqual({
      status: 500,
      body: {
        statusCode: 500,
        code: 'internal_error',
        message: messages.request.internalError,
      },
    });
    expect(JSON.stringify(result.body)).not.toMatch(/ECONNREFUSED|hunter2/);
  });

  it('answers another database error with a 500, not its message', () => {
    expect(send(prismaError('P2003')).body).toMatchObject({
      statusCode: 500,
      code: 'internal_error',
    });
  });

  it('logs server errors with their cause, and not client errors', () => {
    const error = vi
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    const crash = new Error('boom');

    send(new NotFoundException());
    send(crash);

    expect(error).toHaveBeenCalledTimes(1);
    expect(error).toHaveBeenCalledWith({ err: crash }, 'Request failed');
  });
});
