import { plainToInstance, Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsString,
  Matches,
  Max,
  Min,
  MinLength,
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

  /** The platform root domain (`localhost` locally); same value as the web app's NEXT_PUBLIC_ROOT_DOMAIN. */
  @Matches(/^[a-z0-9.-]+$/, {
    message:
      'ROOT_DOMAIN must be a lowercase host name, without scheme or port',
  })
  ROOT_DOMAIN: string;

  /** Signs and verifies access tokens (HS256). At least 32 random bytes. */
  @IsString()
  @MinLength(32)
  JWT_ACCESS_SECRET: string;

  /** `true` in production: Secure cookies with `__Host-` names. `false` only for local http. */
  // Implicit conversion turns the string "false" into `true`, so read the raw input (`obj`)
  // and accept only the exact words.
  @Transform(({ obj }: { obj: Record<string, unknown> }) => {
    const raw = String(obj.COOKIE_SECURE);
    return raw === 'true' ? true : raw === 'false' ? false : raw;
  })
  @IsBoolean({ message: 'COOKIE_SECURE must be true or false' })
  COOKIE_SECURE: boolean;
}

export function validateEnv(
  config: Record<string, unknown>,
): EnvironmentVariables {
  const env = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(env);
  const details = errors.flatMap((error) =>
    Object.values(error.constraints ?? {}),
  );
  if (env.NODE_ENV === NodeEnv.Production && env.COOKIE_SECURE === false) {
    details.push('COOKIE_SECURE must be true when NODE_ENV is production');
  }
  if (details.length > 0) {
    throw new Error(`Invalid environment:\n  ${details.join('\n  ')}`);
  }
  return env;
}
