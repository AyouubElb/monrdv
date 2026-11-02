import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

// The secret is passed on each verify (from JWT_ACCESS_SECRET), so the module needs no options.
// `AuthGuard` is registered as the second APP_GUARD in AppModule, after `HostGuard`.
@Module({
  imports: [JwtModule.register({})],
  exports: [JwtModule],
})
export class AuthModule {}
