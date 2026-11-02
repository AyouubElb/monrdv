import type { TenantInfo } from '@repo/shared';

export class TenantResponseDto implements TenantInfo {
  /** @example "atlas" */
  subdomain: string;

  /** @example "Salon Atlas" */
  name: string;

  /** IANA time zone of the business. @example "Africa/Casablanca" */
  timezone: string;
}
