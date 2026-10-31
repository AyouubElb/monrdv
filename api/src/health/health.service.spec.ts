import { Logger } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service.js';
import { HealthService } from './health.service.js';

// covers: AC-2 (health reports the database state and the host)
describe('HealthService', () => {
  function serviceWith(queryRaw: ReturnType<typeof vi.fn>): HealthService {
    return new HealthService({
      $queryRaw: queryRaw,
    } as unknown as PrismaService);
  }

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('reports ok with the database up and echoes the host', async () => {
    const service = serviceWith(vi.fn().mockResolvedValue([{ '?column?': 1 }]));

    await expect(service.check('atlas.localhost')).resolves.toEqual({
      status: 'ok',
      database: 'up',
      host: 'atlas.localhost',
    });
  });

  it('reports degraded with the database down instead of throwing', async () => {
    vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    const service = serviceWith(
      vi.fn().mockRejectedValue(new Error('connect ECONNREFUSED')),
    );

    await expect(service.check('atlas.localhost')).resolves.toEqual({
      status: 'degraded',
      database: 'down',
      host: 'atlas.localhost',
    });
  });

  it('logs a warning with the cause when the database ping fails', async () => {
    const warn = vi
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);
    const cause = new Error('connect ECONNREFUSED');
    const service = serviceWith(vi.fn().mockRejectedValue(cause));

    await service.check('atlas.localhost');

    expect(warn).toHaveBeenCalledWith({ err: cause }, 'Database ping failed');
  });
});
