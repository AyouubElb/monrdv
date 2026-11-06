export { isMoroccanPhone, normalizeMoroccanPhone } from './phone.js';
export {
  BOOKING_SETTING_CHOICES,
  BUSINESS_KINDS,
  BUSINESS_NAME_MAX_LENGTH,
  BUSINESS_NAME_MIN_LENGTH,
  EMAIL_MAX_LENGTH,
  FIRST_NAME_MAX_LENGTH,
  FIRST_NAME_MIN_LENGTH,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  PASSWORD_RULES,
  PHONE_INPUT_MAX_LENGTH,
  isValidPassword,
  type BookingSettingKey,
  type BusinessKind,
  type PasswordRule,
  type SettingChoice,
} from './rules.js';
export { messages } from './messages.js';
export type {
  ApiError,
  LoginRequest,
  MeResponse,
  SignupRequest,
  SignupResponse,
  SubdomainCheck,
  TenantInfo,
} from './api-types.js';
export {
  RESERVED_SUBDOMAINS,
  SUBDOMAIN_MAX_LENGTH,
  SUBDOMAIN_MIN_LENGTH,
  SUBDOMAIN_PATTERN,
  isValidSubdomain,
  parseHost,
  subdomainProblem,
  suggestSubdomain,
  type ParsedHost,
} from './subdomain.js';
export {
  formatDay,
  formatDuration,
  formatPrice,
  formatTime,
} from './format.js';
export {
  BUSINESS_PALETTE,
  DEFAULT_ACCENT,
  contrastRatio,
  paletteColorOrDefault,
  type PaletteColor,
} from './palette.js';
export {
  formatWallClock,
  instantToWallClock,
  parseWallClock,
  wallClockToInstant,
} from './wall-clock.js';
