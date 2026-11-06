import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiNoContentResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { messages } from '@repo/shared';
import type { Request, Response } from 'express';
import { refreshCookieName } from '../../common/auth/access-token.js';
import {
  clearSessionCookies,
  setSessionCookies,
} from '../../common/auth/session-cookies.js';
import {
  CurrentUser,
  type CurrentUserClaims,
} from '../../common/decorators/current-user.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { RateLimit } from '../../common/rate-limit/rate-limit.decorator.js';
import { CurrentBusiness } from '../../common/tenancy/current-business.decorator.js';
import type { EnvironmentVariables } from '../../config/env.validation.js';
import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { MeResponseDto } from './dto/me-response.dto.js';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  private readonly cookieSecure: boolean;

  constructor(
    private readonly auth: AuthService,
    config: ConfigService<EnvironmentVariables, true>,
  ) {
    this.cookieSecure = config.get('COOKIE_SECURE', { infer: true });
  }

  @Post('login')
  @Public()
  @RateLimit({
    ip: { limit: 5, ttlMs: 15 * 60_000 },
    account: { limit: 5, ttlMs: 15 * 60_000 },
  })
  @HttpCode(200)
  @ApiUnauthorizedResponse({ description: '`invalid_credentials`' })
  @ApiTooManyRequestsResponse({ description: '`too_many_requests`' })
  async login(
    @CurrentBusiness() businessId: string,
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<MeResponseDto> {
    const { me, tokens } = await this.auth.login(
      businessId,
      dto.email,
      dto.password,
    );
    setSessionCookies(res, this.cookieSecure, tokens);
    return me;
  }

  // Public: it reads only the refresh cookie, since the access token may be gone.
  @Post('refresh')
  @Public()
  @RateLimit({ ip: { limit: 30, ttlMs: 15 * 60_000 } })
  @HttpCode(204)
  @ApiNoContentResponse({ description: 'Sets a new cookie pair' })
  @ApiUnauthorizedResponse({
    description: '`unauthenticated`, clears both cookies',
  })
  @ApiTooManyRequestsResponse({ description: '`too_many_requests`' })
  async refresh(
    @CurrentBusiness() businessId: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    const cookies = req.cookies as Record<string, unknown> | undefined;
    const token = cookies?.[refreshCookieName(this.cookieSecure)];
    try {
      if (typeof token !== 'string' || token === '') {
        throw new UnauthorizedException({
          code: 'unauthenticated',
          message: messages.auth.unauthenticated,
        });
      }
      const tokens = await this.auth.refresh(businessId, token);
      setSessionCookies(res, this.cookieSecure, tokens);
    } catch (error) {
      clearSessionCookies(res, this.cookieSecure);
      throw error;
    }
  }

  @Post('logout')
  @HttpCode(204)
  @ApiNoContentResponse({ description: 'Clears both cookies' })
  @ApiUnauthorizedResponse({
    description: '`unauthenticated`, `token_expired`',
  })
  async logout(
    @CurrentUser() user: CurrentUserClaims,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    await this.auth.logout(user);
    clearSessionCookies(res, this.cookieSecure);
  }

  @Get('me')
  @ApiUnauthorizedResponse({
    description: '`unauthenticated`, `token_expired`',
  })
  me(@CurrentUser() user: CurrentUserClaims): Promise<MeResponseDto> {
    return this.auth.me(user);
  }
}
