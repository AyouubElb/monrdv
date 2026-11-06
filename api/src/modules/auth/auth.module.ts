import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { SessionBlockList } from '../../common/auth/session-block-list.service.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { TokensService } from './tokens.service.js';

// Exports what the global `AuthGuard` (registered in AppModule) injects.
@Module({
  imports: [JwtModule.register({})],
  controllers: [AuthController],
  providers: [AuthService, TokensService, SessionBlockList],
  exports: [JwtModule, SessionBlockList],
})
export class AuthModule {}
