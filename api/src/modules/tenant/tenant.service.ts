import { Injectable } from '@nestjs/common';
import { TenantDb } from '../../common/tenancy/tenant-db.service.js';
import type { TenantResponseDto } from './dto/tenant-response.dto.js';

@Injectable()
export class TenantService {
  constructor(private readonly tenantDb: TenantDb) {}

  /** The public details of the business. Row level security shows only this one. */
  getBusiness(businessId: string): Promise<TenantResponseDto> {
    return this.tenantDb.forBusiness(businessId, (tx) =>
      tx.business.findUniqueOrThrow({
        where: { id: businessId },
        select: {
          subdomain: true,
          name: true,
          timezone: true,
          accentColor: true,
        },
      }),
    );
  }
}
