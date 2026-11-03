import { parseWallClock } from '@repo/shared';
import type { StripDay } from '@/components/booking/day-strip';

// Static French sample data for the gallery only (Salon Atlas, as in the dev seed). Never
// real business or customer data.

export const SAMPLE_BUSINESS = 'Salon Atlas';

export const SAMPLE_SERVICES = [
  {
    id: 'coupe-femme',
    name: 'Coupe femme',
    description: 'Shampoing, coupe et coiffage.',
    durationMinutes: 45,
    priceCentimes: 12000,
  },
  {
    id: 'brushing',
    name: 'Brushing',
    description: 'Mise en forme, cheveux courts à longs.',
    durationMinutes: 30,
    priceCentimes: 8000,
  },
  {
    id: 'coupe-homme',
    name: 'Coupe homme',
    durationMinutes: 30,
    priceCentimes: 7000,
  },
  {
    id: 'coloration',
    name: 'Coloration et soin profond à la kératine, cheveux longs',
    durationMinutes: 90,
    priceCentimes: 38550,
  },
];

// Ten days from Tuesday 3 November 2026; Sundays closed, Thursday 5 full.
export const SAMPLE_DAYS: StripDay[] = Array.from(
  { length: 10 },
  (_, index) => {
    const day = parseWallClock(
      `2026-11-${String(3 + index).padStart(2, '0')}T00:00`,
    );
    const closed = day.getUTCDay() === 0 || index === 2;
    return { day, available: !closed };
  },
);

export const SAMPLE_SLOTS = [
  '09:00',
  '09:45',
  '10:30',
  '11:15',
  '14:00',
  '14:30',
  '15:15',
  '16:00',
  '17:30',
].map((time) => parseWallClock(`2026-11-03T${time}`));
