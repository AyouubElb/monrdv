/** Payload of `GET /api/tenant`: the business named by the request host. */
export interface TenantInfo {
  subdomain: string;
  name: string;
  timezone: string;
}

/** Every API error body. `message` is French, from `messages`. */
export interface ApiError {
  statusCode: number;
  code: string;
  message: string;
}
