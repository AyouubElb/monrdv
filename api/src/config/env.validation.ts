import { plainToInstance } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsString,
  Matches,
  Max,
  Min,
  validateSync,
} from 'class-validator';

enum NodeEnv {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

enum LogLevel {
  Fatal = 'fatal',
  Error = 'error',
  Warn = 'warn',
  Info = 'info',
  Debug = 'debug',
  Trace = 'trace',
  Silent = 'silent',
}

/** Every variable the API reads. The API refuses to boot when one is missing or malformed. */
export class EnvironmentVariables {
  @IsEnum(NodeEnv)
  NODE_ENV: NodeEnv = NodeEnv.Development;

  @IsInt()
  @Min(1)
  @Max(65535)
  API_PORT: number = 3001;

  /** Runtime connection as app_user (never the migration role). */
  @Matches(/^postgres(ql)?:\/\//, {
    message: 'DATABASE_URL must be a postgresql:// URL',
  })
  DATABASE_URL: string;

  /** Express `trust proxy` value: who may set X-Forwarded-* headers. */
  @IsString()
  @IsNotEmpty()
  TRUSTED_PROXY = 'loopback';

  @IsEnum(LogLevel)
  LOG_LEVEL: LogLevel = LogLevel.Info;
}

export function validateEnv(
  config: Record<string, unknown>,
): EnvironmentVariables {
  const env = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(env);
  if (errors.length > 0) {
    const details = errors
      .flatMap((error) => Object.values(error.constraints ?? {}))
      .join('\n  ');
    throw new Error(`Invalid environment:\n  ${details}`);
  }
  return env;
}
