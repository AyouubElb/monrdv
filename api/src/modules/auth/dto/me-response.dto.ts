import type { MeResponse } from '@repo/shared';

class MeUserDto {
  id: string;
  /** @example "samira@atlas.test" */
  email: string;
  /** @example "Samira" */
  firstName: string;
}

class MeBusinessDto {
  /** @example "atlas" */
  subdomain: string;
  /** @example "Salon Atlas" */
  name: string;
}

export class MeResponseDto implements MeResponse {
  user: MeUserDto;
  business: MeBusinessDto;
}
