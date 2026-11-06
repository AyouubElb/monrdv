import type { SubdomainCheck } from '@repo/shared';
import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class SubdomainCheckQueryDto {
  /** @example "salon-atlas" */
  @IsString()
  value: string;
}

export class SubdomainCheckDto implements SubdomainCheck {
  @ApiProperty({ enum: ['available', 'taken', 'reserved', 'invalid'] })
  status: SubdomainCheck['status'];
}
