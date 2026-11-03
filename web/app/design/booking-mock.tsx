'use client';

import {
  formatDay,
  formatPrice,
  formatTime,
  parseWallClock,
} from '@repo/shared';
import { useState, type ReactNode } from 'react';
import { DayStrip, dayKey } from '@/components/booking/day-strip';
import { ServiceCard } from '@/components/booking/service-card';
import { SlotGrid } from '@/components/booking/slot-grid';
import { StepHeader } from '@/components/booking/step-header';
import { StickyActionBar } from '@/components/booking/sticky-action-bar';
import { BookingShell } from '@/components/shells/booking-shell';
import {
  SAMPLE_BUSINESS,
  SAMPLE_DAYS,
  SAMPLE_SERVICES,
  SAMPLE_SLOTS,
} from './sample-data';

/** Two booking steps inside phone frames, working with sample data. */
export function BookingMock() {
  const [serviceId, setServiceId] = useState<string | null>('coupe-femme');
  const [selectedDay, setSelectedDay] = useState<string | null>(
    dayKey(SAMPLE_DAYS[0].day),
  );
  const [slot, setSlot] = useState<string | null>(null);
  const service = SAMPLE_SERVICES.find((item) => item.id === serviceId);
  // The sample has one list of times; on other days, nothing is left after 3 November.
  const slots = selectedDay === dayKey(SAMPLE_DAYS[0].day) ? SAMPLE_SLOTS : [];

  return (
    <div className="flex flex-wrap justify-center gap-8 lg:justify-start">
      <PhoneFrame label="Étape 1 : la prestation">
        <BookingShell
          preview
          businessName={SAMPLE_BUSINESS}
          actionBar={
            <StickyActionBar
              label="Continuer"
              disabled={!service}
              onAction={() => {}}
              summary={
                service && (
                  <span>
                    {service.name} ·{' '}
                    <span className="font-semibold text-foreground tabular-nums">
                      {formatPrice(service.priceCentimes)}
                    </span>
                  </span>
                )
              }
            />
          }
        >
          <StepHeader
            step={1}
            totalSteps={4}
            title="Choisissez une prestation"
            headingLevel={3}
          />
          <ul className="flex flex-col gap-3">
            {SAMPLE_SERVICES.map((item) => (
              <li key={item.id}>
                <ServiceCard
                  {...item}
                  selected={item.id === serviceId}
                  onSelect={() => setServiceId(item.id)}
                />
              </li>
            ))}
          </ul>
        </BookingShell>
      </PhoneFrame>

      <PhoneFrame label="Étape 3 : le jour et l’heure">
        <BookingShell
          preview
          businessName={SAMPLE_BUSINESS}
          actionBar={
            <StickyActionBar
              label="Continuer"
              disabled={!slot}
              onAction={() => {}}
              summary={
                slot
                  ? `${formatDay(parseWallClock(slot), 'long')} à ${formatTime(parseWallClock(slot))}`
                  : 'Choisissez une heure'
              }
            />
          }
        >
          <StepHeader
            step={3}
            totalSteps={4}
            title="Choisissez le jour et l’heure"
            onBack={() => {}}
            headingLevel={3}
          />
          <DayStrip
            days={SAMPLE_DAYS}
            selectedKey={selectedDay}
            onSelect={(key) => {
              setSelectedDay(key);
              setSlot(null);
            }}
          />
          <SlotGrid slots={slots} selected={slot} onSelect={setSlot} />
        </BookingShell>
      </PhoneFrame>
    </div>
  );
}

/**
 * A 360px wide phone. `transform-gpu` makes it the containing block of the fixed action bar,
 * so the bar sticks to the bottom of the frame instead of the window.
 */
function PhoneFrame({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <figure className="flex flex-col items-center gap-3">
      <div className="h-[720px] w-[360px] max-w-[calc(100vw-2rem)] transform-gpu overflow-hidden rounded-[2.5rem] border-8 border-foreground bg-background shadow-lg">
        <div className="flex h-full flex-col overflow-y-auto">{children}</div>
      </div>
      <figcaption className="text-sm text-muted-foreground">{label}</figcaption>
    </figure>
  );
}
