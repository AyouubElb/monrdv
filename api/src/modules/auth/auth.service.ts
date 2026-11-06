import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { messages, type MeResponse } from '@repo/shared';
import { verifyPassword } from '../../common/auth/password.js';
import { SessionBlockList } from '../../common/auth/session-block-list.service.js';
import { hashToken } from '../../common/auth/token-hash.js';
import type { CurrentUserClaims } from '../../common/decorators/current-user.decorator.js';
import { TenantDb } from '../../common/tenancy/tenant-db.service.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { TokensService, type SessionTokens } from './tokens.service.js';

const ME_SELECT = {
  id: true,
  email: true,
  role: true,
  staff: { select: { name: true } },
  business: { select: { subdomain: true, name: true } },
} as const;

type MeRow = Prisma.UserGetPayload<{ select: typeof ME_SELECT }>;

// A rotated token presented again this soon is two tabs racing, not a thief.
export const REUSE_GRACE_MS = 20_000;

type RefreshOutcome =
  | { kind: 'issued'; tokens: SessionTokens }
  | { kind: 'invalid' }
  | { kind: 'reuse'; familyId: string; userId: string };

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly tenantDb: TenantDb,
    private readonly tokens: TokensService,
    private readonly blockList: SessionBlockList,
  ) {}

  login(
    businessId: string,
    email: string,
    password: string,
  ): Promise<{ me: MeResponse; tokens: SessionTokens }> {
    return this.tenantDb.forBusiness(businessId, async (tx) => {
      const user = await tx.user.findUnique({
        where: { businessId_email: { businessId, email } },
        select: { ...ME_SELECT, passwordHash: true },
      });
      const valid = await verifyPassword(user?.passwordHash ?? null, password);
      if (!user || !valid) {
        this.logger.log(
          { event: 'auth.login.failed', businessId },
          'Login failed',
        );
        throw new UnauthorizedException({
          code: 'invalid_credentials',
          message: messages.auth.invalidCredentials,
        });
      }

      const familyId = await this.tokens.newFamilyId(tx);
      const tokens = await this.tokens.issue(tx, businessId, user, familyId);
      await this.tokens.deleteDeadRows(tx, user.id);

      this.logger.log(
        { event: 'auth.login.succeeded', businessId, userId: user.id },
        'Login succeeded',
      );
      return { me: toMe(user), tokens };
    });
  }

  async refresh(
    businessId: string,
    refreshToken: string,
  ): Promise<SessionTokens> {
    // The transaction returns instead of throwing, so a revoked family stays revoked.
    const outcome = await this.tenantDb.forBusiness(
      businessId,
      async (tx): Promise<RefreshOutcome> => {
        const row = await tx.refreshToken.findUnique({
          where: {
            businessId_tokenHash: {
              businessId,
              tokenHash: hashToken(refreshToken),
            },
          },
          select: {
            id: true,
            familyId: true,
            expiresAt: true,
            rotatedAt: true,
            revokedAt: true,
            user: { select: { id: true, role: true } },
          },
        });
        const now = Date.now();
        if (!row || row.revokedAt || row.expiresAt.getTime() <= now) {
          return { kind: 'invalid' };
        }

        let rotatedAt = row.rotatedAt;
        if (!rotatedAt) {
          // A parallel refresh waits on the row lock, then updates 0 rows.
          const { count } = await tx.refreshToken.updateMany({
            where: { id: row.id, rotatedAt: null },
            data: { rotatedAt: new Date(now) },
          });
          if (count === 0) {
            const current = await tx.refreshToken.findUnique({
              where: { id: row.id },
              select: { rotatedAt: true, revokedAt: true },
            });
            if (!current?.rotatedAt || current.revokedAt) {
              return { kind: 'invalid' };
            }
            rotatedAt = current.rotatedAt;
          }
        }

        if (rotatedAt && now - rotatedAt.getTime() > REUSE_GRACE_MS) {
          await this.tokens.revokeFamily(tx, row.familyId);
          return { kind: 'reuse', familyId: row.familyId, userId: row.user.id };
        }

        const tokens = await this.tokens.issue(
          tx,
          businessId,
          row.user,
          row.familyId,
        );
        await this.tokens.deleteDeadRows(tx, row.user.id);
        return { kind: 'issued', tokens };
      },
    );

    if (outcome.kind === 'issued') return outcome.tokens;
    if (outcome.kind === 'reuse') {
      this.blockList.block(outcome.familyId);
      this.logger.warn(
        {
          event: 'auth.refresh.reuse_detected',
          businessId,
          userId: outcome.userId,
        },
        'Refresh token reused, family revoked',
      );
    }
    throw unauthenticated();
  }

  async logout(claims: CurrentUserClaims): Promise<void> {
    await this.tenantDb.forBusiness(claims.businessId, (tx) =>
      this.tokens.revokeFamily(tx, claims.sid),
    );
    this.blockList.block(claims.sid);
    this.logger.log(
      {
        event: 'auth.logout',
        businessId: claims.businessId,
        userId: claims.userId,
      },
      'Logout',
    );
  }

  async me(claims: CurrentUserClaims): Promise<MeResponse> {
    const user = await this.tenantDb.forBusiness(claims.businessId, (tx) =>
      tx.user.findUnique({ where: { id: claims.userId }, select: ME_SELECT }),
    );
    if (!user) throw unauthenticated();
    return toMe(user);
  }
}

function unauthenticated(): UnauthorizedException {
  return new UnauthorizedException({
    code: 'unauthenticated',
    message: messages.auth.unauthenticated,
  });
}

function toMe(user: MeRow): MeResponse {
  return {
    user: { id: user.id, email: user.email, firstName: user.staff?.name ?? '' },
    business: { subdomain: user.business.subdomain, name: user.business.name },
  };
}
