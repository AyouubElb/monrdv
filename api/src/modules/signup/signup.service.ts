import { ConflictException, Injectable, Logger } from '@nestjs/common';
import {
  messages,
  normalizeMoroccanPhone,
  subdomainProblem,
} from '@repo/shared';
import { hashPassword } from '../../common/auth/password.js';
import { isUniqueViolation } from '../../common/prisma/unique-violation.js';
import { TenantDb } from '../../common/tenancy/tenant-db.service.js';
import type { SignupDto, SignupResponseDto } from './dto/signup.dto.js';
import type { SubdomainCheckDto } from './dto/subdomain-check.dto.js';

@Injectable()
export class SignupService {
  private readonly logger = new Logger(SignupService.name);

  constructor(private readonly tenantDb: TenantDb) {}

  async checkSubdomain(value: string): Promise<SubdomainCheckDto> {
    const problem = subdomainProblem(value);
    if (problem) return { status: problem };
    const taken = await this.tenantDb.subdomainTaken(value);
    return { status: taken ? 'taken' : 'available' };
  }

  async signup(dto: SignupDto): Promise<SignupResponseDto> {
    const phone = normalizeMoroccanPhone(dto.phone) as string;
    const passwordHash = await hashPassword(dto.password);

    let businessId: string;
    try {
      businessId = await this.tenantDb.forNewBusiness(async (tx, id) => {
        await tx.business.create({
          data: {
            id,
            subdomain: dto.subdomain,
            name: dto.businessName,
            kind: dto.kind,
            phone,
            minNoticeMinutes: dto.minNoticeMinutes,
            bookingWindowDays: dto.bookingWindowDays,
            cancelNoticeHours: dto.cancelNoticeHours,
          },
          select: { id: true },
        });
        const user = await tx.user.create({
          data: {
            businessId: id,
            email: dto.email,
            passwordHash,
            role: 'owner',
          },
          select: { id: true },
        });
        await tx.staff.create({
          data: { businessId: id, name: dto.firstName, userId: user.id },
          select: { id: true },
        });
        return id;
      });
    } catch (error) {
      // The unique subdomain index settles a race between two signups.
      if (isUniqueViolation(error)) {
        throw new ConflictException({
          code: 'subdomain_taken',
          message: messages.subdomain.taken,
        });
      }
      throw error;
    }

    this.logger.log(
      { event: 'signup.created', businessId, subdomain: dto.subdomain },
      'Business created',
    );
    return { subdomain: dto.subdomain };
  }
}
