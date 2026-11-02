import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { Module, ValidationPipe } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD, APP_PIPE } from '@nestjs/core';
import { LoggerModule } from 'nestjs-pino';
import { AuthGuard } from './auth/auth.guard.js';
import { AuthModule } from './auth/auth.module.js';
import {
  validateEnv,
  type EnvironmentVariables,
} from './config/env.validation.js';
import { HealthModule } from './health/health.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { HostGuard } from './tenancy/host.guard.js';
import { TenancyModule } from './tenancy/tenancy.module.js';
import type { TenantRequest } from './tenancy/tenant-request.js';
import { TenantModule } from './tenant/tenant.module.js';

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
    PrismaModule,
    TenancyModule,
    AuthModule,
    HealthModule,
    TenantModule,
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
      }),
    },
  ],
})
export class AppModule {}
