import { Module } from '@nestjs/common';
import { SignupController } from './signup.controller.js';
import { SignupService } from './signup.service.js';

@Module({
  controllers: [SignupController],
  providers: [SignupService],
})
export class SignupModule {}
