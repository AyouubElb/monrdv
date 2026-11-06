export class HealthResponseDto {
  status: 'ok' | 'degraded';
  database: 'up' | 'down';
  /** The host the request was made to, as seen through the trusted proxy. */
  host: string;
}
