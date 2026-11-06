import { Controller, Get, Module } from '@nestjs/common';
import {
  CurrentUser,
  type CurrentUserClaims,
} from '../src/common/decorators/current-user.decorator.js';
import { Public } from '../src/common/decorators/public.decorator.js';
import { CurrentBusiness } from '../src/common/tenancy/current-business.decorator.js';
import {
  AnyHost,
  PlatformRoute,
} from '../src/common/tenancy/route-host.decorators.js';

/**
 * Test only routes, one per route kind, behind the real global guards
 * (`createTestApp([ProbeModule])`). Each answers what the guards let through.
 */
@Controller('probe')
class ProbeController {
  /** Business route (the default), public. */
  @Get('business')
  @Public()
  business(@CurrentBusiness() businessId: string) {
    return { businessId };
  }

  /** Business route, protected: needs an access token for the host's business. */
  @Get('protected')
  protectedRoute(
    @CurrentBusiness() businessId: string,
    @CurrentUser() user: CurrentUserClaims,
  ) {
    return { businessId, user };
  }

  @Get('platform')
  @PlatformRoute()
  @Public()
  platform() {
    return { ok: true };
  }

  /** Protected but not a business route: no business to match, so always refused. */
  @Get('platform-protected')
  @PlatformRoute()
  platformProtected() {
    return { ok: true };
  }

  @Get('any')
  @AnyHost()
  @Public()
  any() {
    return { ok: true };
  }
}

@Module({ controllers: [ProbeController] })
export class ProbeModule {}
