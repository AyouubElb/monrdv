// Display formats (spec 0004, Display formats). Times and days take wall clock values (spec
// 0003): their UTC fields hold the business's clock, so these read the UTC fields and never
// shift by the time zone of the machine that runs them.

// A no break space keeps "DH" on the same line as its number.
const NO_BREAK_SPACE = String.fromCharCode(0xa0);

/** 15000 → "150 DH", 8550 → "85,50 DH": decimals only when there are centimes. */
export function formatPrice(centimes: number): string {
  const hasCentimes = centimes % 100 !== 0;
  const amount = new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: hasCentimes ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(centimes / 100);
  return `${amount}${NO_BREAK_SPACE}DH`;
}

/** 45 → "45 min", 60 → "1 h", 90 → "1 h 30". */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}${NO_BREAK_SPACE}min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  const text = `${hours}${NO_BREAK_SPACE}h`;
  return rest === 0
    ? text
    : `${text}${NO_BREAK_SPACE}${String(rest).padStart(2, '0')}`;
}

// Read in UTC on purpose: a wall clock Date keeps the business's clock in its UTC fields.
const TIME = new Intl.DateTimeFormat('fr-FR', {
  timeZone: 'UTC',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

/** Wall clock → "14:30". */
export function formatTime(wall: Date): string {
  return TIME.format(wall);
}

const DAY_SHORT = new Intl.DateTimeFormat('fr-FR', {
  timeZone: 'UTC',
  weekday: 'short',
  day: 'numeric',
  month: 'short',
});
const DAY_LONG = new Intl.DateTimeFormat('fr-FR', {
  timeZone: 'UTC',
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});

/** Wall clock → "mar. 3 nov." (short) or "mardi 3 novembre" (long). */
export function formatDay(wall: Date, length: 'short' | 'long'): string {
  return (length === 'short' ? DAY_SHORT : DAY_LONG).format(wall);
}
