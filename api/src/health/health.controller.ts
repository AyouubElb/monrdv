import { Controller, Get, HttpStatus, Req, Res } from '@nestjs/common';
import { ApiServiceUnavailableResponse, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { Public } from '../auth/public.decorator.js';
import { AnyHost } from '../tenancy/route-host.decorators.js';
import { HealthResponseDto } from './health-response.dto.js';
import { HealthService } from './health.service.js';

// Answers on every host with no session: the deploy check and Nginx call it directly.
@ApiTags('health')
@Controller('health')
@AnyHost()
@Public()
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Get()
  @ApiServiceUnavailableResponse({
    description: 'The database is unreachable',
    type: HealthResponseDto,
  })
  async check(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<HealthResponseDto> {
    // `hostname` honors X-Forwarded-Host only from TRUSTED_PROXY addresses.
    const report = await this.health.check(req.hostname);
    if (report.database === 'down') res.status(HttpStatus.SERVICE_UNAVAILABLE);
    return report;
  }
}
