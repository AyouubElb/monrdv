import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator.js';
import { RateLimit } from '../../common/rate-limit/rate-limit.decorator.js';
import { PlatformRoute } from '../../common/tenancy/route-host.decorators.js';
import { SignupDto, SignupResponseDto } from './dto/signup.dto.js';
import {
  SubdomainCheckDto,
  SubdomainCheckQueryDto,
} from './dto/subdomain-check.dto.js';
import { SignupService } from './signup.service.js';

@ApiTags('signup')
@Controller('signup')
@Public()
@PlatformRoute()
export class SignupController {
  constructor(private readonly signupService: SignupService) {}

  // Step 1 asks before the owner types their account details.
  @Get('subdomain')
  @RateLimit({ ip: { limit: 30, ttlMs: 15 * 60_000 } })
  @ApiTooManyRequestsResponse({ description: '`too_many_requests`' })
  checkSubdomain(
    @Query() query: SubdomainCheckQueryDto,
  ): Promise<SubdomainCheckDto> {
    return this.signupService.checkSubdomain(query.value);
  }

  // No cookie: the owner signs in on the new subdomain.
  @Post()
  @RateLimit({ ip: { limit: 5, ttlMs: 60 * 60_000 } })
  @ApiBadRequestResponse({ description: '`validation_failed`' })
  @ApiConflictResponse({ description: '`subdomain_taken`' })
  @ApiTooManyRequestsResponse({ description: '`too_many_requests`' })
  signup(@Body() dto: SignupDto): Promise<SignupResponseDto> {
    return this.signupService.signup(dto);
  }
}
