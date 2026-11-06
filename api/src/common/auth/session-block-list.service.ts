import { Injectable } from '@nestjs/common';
import { ACCESS_TOKEN_TTL_SECONDS } from './access-token.js';

// In memory: a restart empties it, and a second API instance needs Redis first (spec 0005).
@Injectable()
export class SessionBlockList {
  private readonly blocked = new Map<string, number>();

  // Long enough for every access token of that `sid` to expire on its own.
  block(sid: string): void {
    this.blocked.set(sid, Date.now() + ACCESS_TOKEN_TTL_SECONDS * 1000);
  }

  has(sid: string): boolean {
    this.sweep();
    return this.blocked.has(sid);
  }

  private sweep(): void {
    const now = Date.now();
    for (const [sid, expiresAt] of this.blocked) {
      if (expiresAt <= now) this.blocked.delete(sid);
    }
  }
}
