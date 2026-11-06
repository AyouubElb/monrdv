import {
  BOOKING_SETTING_CHOICES,
  BUSINESS_KINDS,
  BUSINESS_NAME_MAX_LENGTH,
  BUSINESS_NAME_MIN_LENGTH,
  EMAIL_MAX_LENGTH,
  FIRST_NAME_MAX_LENGTH,
  FIRST_NAME_MIN_LENGTH,
  type BusinessKind,
  type SignupRequest,
  type SignupResponse,
} from '@repo/shared';
import { IsEmail, IsIn, IsString, Length, MaxLength } from 'class-validator';
import { IsMoroccanPhone } from '../../../common/validation/is-moroccan-phone.decorator.js';
import {
  IsAvailableSubdomainFormat,
  IsValidPassword,
} from '../../../common/validation/shared-rules.decorators.js';
import { Trim, TrimLowercase } from '../../../common/validation/trim.js';

const values = (key: keyof typeof BOOKING_SETTING_CHOICES) =>
  BOOKING_SETTING_CHOICES[key].choices.map((choice) => choice.value);

export class SignupDto implements SignupRequest {
  /** @example "Salon Atlas" */
  @Trim()
  @IsString()
  @Length(BUSINESS_NAME_MIN_LENGTH, BUSINESS_NAME_MAX_LENGTH)
  businessName: string;

  @IsIn(BUSINESS_KINDS)
  kind: BusinessKind;

  /** @example "salon-atlas" */
  @IsAvailableSubdomainFormat()
  subdomain: string;

  /** @example "06 12 34 56 78" */
  @IsMoroccanPhone()
  phone: string;

  /** @example 60 */
  @IsIn(values('minNoticeMinutes'))
  minNoticeMinutes: number;

  /** @example 60 */
  @IsIn(values('bookingWindowDays'))
  bookingWindowDays: number;

  /** @example 24 */
  @IsIn(values('cancelNoticeHours'))
  cancelNoticeHours: number;

  /** @example "Samira" */
  @Trim()
  @IsString()
  @Length(FIRST_NAME_MIN_LENGTH, FIRST_NAME_MAX_LENGTH)
  firstName: string;

  /** @example "samira@example.ma" */
  @TrimLowercase()
  @IsEmail()
  @MaxLength(EMAIL_MAX_LENGTH)
  email: string;

  @IsValidPassword()
  password: string;
}

export class SignupResponseDto implements SignupResponse {
  /** @example "salon-atlas" */
  subdomain: string;
}
