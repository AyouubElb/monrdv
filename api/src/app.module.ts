import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { Module, ValidationPipe } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_PIPE } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { ApiExceptionFilter } from './common/filters/api-exception.filter.js';
import { validationException } from './common/filters/validation-exception.factory.js';
import { AuthGuard } from './common/guards/auth.guard.js';
import { PrismaModule } from './common/prisma/prisma.module.js';
import { THROTTLERS } from './common/rate-limit/rate-limit.guard.js';
import { HostGuard } from './common/tenancy/host.guard.js';
import { TenancyModule } from './common/tenancy/tenancy.module.js';
import type { TenantRequest } from './common/tenancy/tenant-request.js';
import {
  validateEnv,
  type EnvironmentVariables,
} from './config/env.validation.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { SignupModule } from './modules/signup/signup.module.js';
import { TenantModule } from './modules/tenant/tenant.module.js';

const REQUEST_ID = /^[\w-]{1,64}$/;

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      // Locally the root `.env`; in production the variables come from the container.
      envFilePath: resolve(process.cwd(), '../.env'),
      validate: validateEnv,
    }),
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvironmentVariables, true>) => ({
        pinoHttp: {
          level: config.get('LOG_LEVEL', { infer: true }),
          genReqId: (req, res) => {
            const incoming = req.headers['x-request-id'];
            const id =
              typeof incoming === 'string' && REQUEST_ID.test(incoming)
                ? incoming
                : randomUUID();
            res.setHeader('x-request-id', id);
            return id;
          },
          // Read again when the response finishes, after HostGuard resolved the business.
          customProps: (req) => ({
            business: (req as TenantRequest).business?.subdomain,
          }),
          redact: [
            'req.headers.cookie',
            'req.headers.authorization',
            'res.headers["set-cookie"]',
          ],
        },
      }),
    }),
    // In memory: a restart empties the counts, and a second instance needs Redis.
    ThrottlerModule.forRoot(THROTTLERS),
    PrismaModule,
    TenancyModule,
    AuthModule,
    HealthModule,
    TenantModule,
    SignupModule,
  ],
  providers: [
    // Guards run in this order: the host decides the business, then the session must match it.
    { provide: APP_GUARD, useClass: HostGuard },
    { provide: APP_GUARD, useClass: AuthGuard },
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        exceptionFactory: validationException,
      }),
    },
    { provide: APP_FILTER, useClass: ApiExceptionFilter },
  ],
})
export class AppModule {}
