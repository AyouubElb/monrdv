'use client';

import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** The top of a booking step: back arrow, "Étape 2 sur 4", and the step's question. */
export function StepHeader({
  step,
  totalSteps,
  title,
  onBack,
  headingLevel = 1,
}: {
  step: number;
  totalSteps: number;
  title: string;
  /** Leave out on the first step: there is nothing to go back to. */
  onBack?: () => void;
  /** The step title is the page's `h1`; the `/design` gallery shows it inside a page, as `h3`. */
  headingLevel?: 1 | 3;
}) {
  const Heading = headingLevel === 1 ? 'h1' : 'h3';
  return (
    <div className="flex flex-col gap-3">
      <div className="flex min-h-11 items-center gap-2">
        {onBack && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            aria-label="Étape précédente"
            className="-ml-3"
          >
            <ArrowLeft />
          </Button>
        )}
        <p className="text-sm font-medium text-muted-foreground">
          Étape {step} sur {totalSteps}
        </p>
      </div>
      <Heading className="text-3xl font-semibold text-balance md:text-4xl">
        {title}
      </Heading>
    </div>
  );
}
