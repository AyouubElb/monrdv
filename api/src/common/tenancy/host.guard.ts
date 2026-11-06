import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { messages, parseHost } from '@repo/shared';
import type { EnvironmentVariables } from '../../config/env.validation.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  ROUTE_HOST_KIND,
  type RouteHostKind,
} from './route-host.decorators.js';
import type { TenantRequest } from './tenant-request.js';

/**
 * First global guard: turns the request host into a business (spec 0002, HostGuard table).
 * Business routes (the default) need a known business subdomain; `@PlatformRoute()` needs
 * the root domain; `@AnyHost()` passes everywhere without a lookup.
 */
@Injectable()
export class HostGuard implements CanActivate {
  private readonly rootDomain: string;

  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
    config: ConfigService<EnvironmentVariables, true>,
  ) {
    this.rootDomain = config.get('ROOT_DOMAIN', { infer: true });
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const kind =
      this.reflector.getAllAndOverride<RouteHostKind | undefined>(
        ROUTE_HOST_KIND,
        [context.getHandler(), context.getClass()],
      ) ?? 'business';
    if (kind === 'any') return true;

    const req = context.switchToHttp().getRequest<TenantRequest>();
    // `hostname` honors X-Forwarded-Host only from TRUSTED_PROXY addresses.
    const host = parseHost(req.hostname ?? '', this.rootDomain);

    if (kind === 'platform') {
      if (host.kind === 'root') return true;
      throw notFound('not_found', messages.tenant.notFound);
    }

    if (host.kind !== 'business') throw businessNotFound();
    const [row] = await this.prisma.$queryRaw<{ id: string | null }[]>`
      SELECT business_by_subdomain(${host.subdomain})::text AS id`;
    if (!row?.id) throw businessNotFound();

    req.business = { id: row.id, subdomain: host.subdomain };
    return true;
  }
}

function businessNotFound(): NotFoundException {
  return notFound('business_not_found', messages.tenant.businessNotFound);
}

function notFound(code: string, message: string): NotFoundException {
  return new NotFoundException({ code, message });
}
