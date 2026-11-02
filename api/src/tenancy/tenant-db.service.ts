import { Injectable } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

// Prisma defaults for every business transaction: `timeout` matches app_user's statement_timeout.
const TRANSACTION_OPTIONS = { maxWait: 2_000, timeout: 5_000 };

/**
 * The only way services reach business owned tables. Each call opens one transaction and
 * tells Postgres which business it serves; row level security filters every row from there.
 * The setting is local to the transaction (`set_config(..., true)`), so it never leaks to
 * the next use of the same connection.
 */
@Injectable()
export class TenantDb {
  constructor(private readonly prisma: PrismaService) {}

  /** Runs `work` inside one transaction locked to `businessId`. One call per service method, never nested. */
  forBusiness<T>(
    businessId: string,
    work: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT set_config('app.business_id', ${businessId}, true)`;
      return work(tx);
    }, TRANSACTION_OPTIONS);
  }

  /**
   * Like `forBusiness`, for a business that does not exist yet (signup): picks its id first,
   * so the business row and its owner can be inserted under the `business_self` policy.
   */
  forNewBusiness<T>(
    work: (tx: Prisma.TransactionClient, businessId: string) => Promise<T>,
  ): Promise<T> {
    return this.prisma.$transaction(async (tx) => {
      const [{ id: businessId }] = await tx.$queryRaw<
        { id: string }[]
      >`SELECT uuidv7()::text AS id`;
      await tx.$queryRaw`SELECT set_config('app.business_id', ${businessId}, true)`;
      return work(tx, businessId);
    }, TRANSACTION_OPTIONS);
  }
}
