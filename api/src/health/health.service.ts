import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { HealthResponseDto } from './health-response.dto.js';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(private readonly prisma: PrismaService) {}

  async check(host: string): Promise<HealthResponseDto> {
    const database = await this.pingDatabase();
    return { status: database === 'up' ? 'ok' : 'degraded', database, host };
  }

  private async pingDatabase(): Promise<'up' | 'down'> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return 'up';
    } catch (error) {
      this.logger.warn({ err: error }, 'Database ping failed');
      return 'down';
    }
  }
}
