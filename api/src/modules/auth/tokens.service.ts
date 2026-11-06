import { randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  ACCESS_TOKEN_TTL_SECONDS,
  REFRESH_TOKEN_TTL_SECONDS,
  type AccessTokenPayload,
} from '../../common/auth/access-token.js';
import { hashToken } from '../../common/auth/token-hash.js';
import type { EnvironmentVariables } from '../../config/env.validation.js';
import type { Prisma } from '../../generated/prisma/client.js';

export interface SessionTokens {
  accessToken: string;
  refreshToken: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;

// Every method runs inside the caller's `TenantDb.forBusiness` transaction.
@Injectable()
export class TokensService {
  private readonly secret: string;

  constructor(
    private readonly jwt: JwtService,
    config: ConfigService<EnvironmentVariables, true>,
  ) {
    this.secret = config.get('JWT_ACCESS_SECRET', { infer: true });
  }

  // A login starts a new family; its id is the `sid` claim.
  async newFamilyId(tx: Prisma.TransactionClient): Promise<string> {
    const [{ id }] = await tx.$queryRaw<
      { id: string }[]
    >`SELECT uuidv7()::text AS id`;
    return id;
  }

  async issue(
    tx: Prisma.TransactionClient,
    businessId: string,
    user: { id: string; role: string },
    familyId: string,
  ): Promise<SessionTokens> {
    const refreshToken = randomBytes(32).toString('base64url');
    await tx.refreshToken.create({
      data: {
        businessId,
        userId: user.id,
        familyId,
        tokenHash: hashToken(refreshToken),
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000),
      },
      select: { id: true },
    });
    const claims: Omit<AccessTokenPayload, 'exp'> = {
      sub: user.id,
      bid: businessId,
      role: user.role,
      sid: familyId,
    };
    const accessToken = this.jwt.sign(claims, {
      secret: this.secret,
      algorithm: 'HS256',
      expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    });
    return { accessToken, refreshToken };
  }

  async revokeFamily(
    tx: Prisma.TransactionClient,
    familyId: string,
  ): Promise<void> {
    await tx.refreshToken.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  // Clean as you go (AC-15): only this user's dead rows; RLS keeps it in the business.
  async deleteDeadRows(
    tx: Prisma.TransactionClient,
    userId: string,
  ): Promise<void> {
    const now = Date.now();
    await tx.refreshToken.deleteMany({
      where: {
        userId,
        OR: [
          { expiresAt: { lt: new Date(now) } },
          { revokedAt: { lt: new Date(now - DAY_MS) } },
        ],
      },
    });
  }
}
