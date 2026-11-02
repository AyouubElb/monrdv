import { TZDate } from '@date-fns/tz';

// Two kinds of time (spec 0003). A wall clock Date holds what the business's clock shows in its
// UTC fields: `2026-09-25T10:00:00Z` means 10:00 on the business's clock, whatever its offset.
// Never compare one with `new Date()` or another instant; convert first with these helpers.

const WALL_CLOCK_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

/** 'YYYY-MM-DDTHH:mm' → wall clock Date. Throws on any other shape. */
export function parseWallClock(text: string): Date {
  const match = WALL_CLOCK_PATTERN.exec(text);
  if (!match) {
    throw new Error(`not a wall clock time (YYYY-MM-DDTHH:mm): ${text}`);
  }
  const [, year, month, day, hour, minute] = match.map(Number);
  const wall = new Date(Date.UTC(year, month - 1, day, hour, minute));
  // Date.UTC rolls 30 February over to March; refuse it instead.
  if (formatWallClock(wall) !== text) {
    throw new Error(`not a real wall clock time: ${text}`);
  }
  return wall;
}

/** Wall clock Date → 'YYYY-MM-DDTHH:mm'. */
export function formatWallClock(wall: Date): string {
  return wall.toISOString().slice(0, 16);
}

/** The real moment a wall clock reading happens in a time zone. */
export function wallClockToInstant(wall: Date, timeZone: string): Date {
  const zoned = new TZDate(
    wall.getUTCFullYear(),
    wall.getUTCMonth(),
    wall.getUTCDate(),
    wall.getUTCHours(),
    wall.getUTCMinutes(),
    timeZone,
  );
  return new Date(zoned.getTime());
}

/** What a time zone's clock shows at an instant, to the minute. */
export function instantToWallClock(instant: Date, timeZone: string): Date {
  const zoned = new TZDate(instant.getTime(), timeZone);
  return new Date(
    Date.UTC(
      zoned.getFullYear(),
      zoned.getMonth(),
      zoned.getDate(),
      zoned.getHours(),
      zoned.getMinutes(),
    ),
  );
}
