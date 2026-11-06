import type { BusinessKind } from './rules.js';

/** Payload of `GET /api/tenant`: the business named by the request host. */
export interface TenantInfo {
  subdomain: string;
  name: string;
  timezone: string;
  /** `#rrggbb` as stored, or `null`. Pass it through `paletteColorOrDefault` before display. */
  accentColor: string | null;
}

/** Every API error body. `message` is French, from `messages`. */
export interface ApiError {
  statusCode: number;
  code: string;
  message: string;
}

export interface SubdomainCheck {
  status: 'available' | 'taken' | 'reserved' | 'invalid';
}

export interface SignupRequest {
  businessName: string;
  kind: BusinessKind;
  subdomain: string;
  phone: string;
  minNoticeMinutes: number;
  bookingWindowDays: number;
  cancelNoticeHours: number;
  firstName: string;
  email: string;
  password: string;
}

export interface SignupResponse {
  subdomain: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface MeResponse {
  user: { id: string; email: string; firstName: string };
  business: { subdomain: string; name: string };
}
