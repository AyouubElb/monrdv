import { Global, Module } from '@nestjs/common';
import { TenantDb } from './tenant-db.service.js';

// `HostGuard` is registered as the first APP_GUARD in AppModule, so the guard order is in one place.
@Global()
@Module({
  providers: [TenantDb],
  exports: [TenantDb],
})
export class TenancyModule {}
