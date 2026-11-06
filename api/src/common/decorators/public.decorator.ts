import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC = 'isPublic';

/** Opens a route to visitors with no session. Every other route needs a valid access token. */
export const Public = () => SetMetadata(IS_PUBLIC, true);
