import {
  EMAIL_MAX_LENGTH,
  PASSWORD_MAX_LENGTH,
  type LoginRequest,
} from '@repo/shared';
import { IsString, Length } from 'class-validator';
import { TrimLowercase } from '../../../common/validation/trim.js';

// No email format rule: a bad email gets the same 401 as a wrong password.
export class LoginDto implements LoginRequest {
  /** @example "samira@atlas.test" */
  @TrimLowercase()
  @IsString()
  @Length(1, EMAIL_MAX_LENGTH)
  email: string;

  @IsString()
  @Length(1, PASSWORD_MAX_LENGTH)
  password: string;
}
