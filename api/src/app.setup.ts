import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import { originCheck } from './common/middleware/origin-check.middleware.js';
import type { EnvironmentVariables } from './config/env.validation.js';

/** Settings shared by `main.ts` and the tests, so tests run the real app setup. */
export function configureApp(app: NestExpressApplication): void {
  const config =
    app.get<ConfigService<EnvironmentVariables, true>>(ConfigService);

  app.useLogger(app.get(Logger));
  // Nginx (and the web app on the private network) forward the visitor's host and IP.
  app.set('trust proxy', config.get('TRUSTED_PROXY', { infer: true }));
  // AuthGuard reads the access token from its cookie.
  app.use(cookieParser());
  // Before the routes, so a refused request writes nothing.
  app.use(originCheck(config.get('COOKIE_SECURE', { infer: true })));
  app.setGlobalPrefix('api');
  app.enableShutdownHooks();

  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder().setTitle('MonRDV API').setVersion('0.1.0').build(),
  );
  SwaggerModule.setup('api/docs', app, document);
}
