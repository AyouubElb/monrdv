/** First IANA release with Morocco's permanent return to GMT on 20 September 2026 (decree 2.26.530). */
export const MIN_TZDATA_VERSION = '2026c';

/** Compares IANA tz data versions such as `2026a` and `2026c`. */
export function isTzDataAtLeast(version: string, minimum: string): boolean {
  const current = parseTzVersion(version);
  const required = parseTzVersion(minimum);
  if (!current || !required) return false;
  if (current.year !== required.year) return current.year > required.year;
  if (current.letters.length !== required.letters.length) {
    return current.letters.length > required.letters.length;
  }
  return current.letters >= required.letters;
}

/** Throws when the runtime's time zone data predates Morocco's 2026 change. */
export function assertTzData(version = process.versions.tz): void {
  if (!version || !isTzDataAtLeast(version, MIN_TZDATA_VERSION)) {
    throw new Error(
      `Time zone data ${version ?? 'unknown'} is older than ${MIN_TZDATA_VERSION}, ` +
        `so Moroccan booking times would be off by an hour. Run on a Node.js build with newer tz data.`,
    );
  }
}

function parseTzVersion(
  version: string,
): { year: number; letters: string } | null {
  const match = /^(\d{4})([a-z]+)$/.exec(version);
  return match ? { year: Number(match[1]), letters: match[2] } : null;
}
