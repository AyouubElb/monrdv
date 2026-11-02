export { isMoroccanPhone, normalizeMoroccanPhone } from './phone.js';
export { PHONE_INPUT_MAX_LENGTH } from './rules.js';
export { messages } from './messages.js';
export type { ApiError, TenantInfo } from './api-types.js';
export {
  RESERVED_SUBDOMAINS,
  SUBDOMAIN_MAX_LENGTH,
  SUBDOMAIN_MIN_LENGTH,
  SUBDOMAIN_PATTERN,
  isValidSubdomain,
  parseHost,
  type ParsedHost,
} from './subdomain.js';
