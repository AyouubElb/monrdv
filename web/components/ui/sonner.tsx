'use client';

import { Toaster as Sonner, type ToasterProps } from 'sonner';
import {
  CircleCheckIcon,
  InfoIcon,
  TriangleAlertIcon,
  OctagonXIcon,
  Loader2Icon,
} from 'lucide-react';

// Light only (spec 0004), so no theme switching. Toasts render in the same document, so the
// business `--primary` on `:root` reaches them, but only where we use it: Sonner paints its
// action button with its own text color and removes its outline, with selectors stronger than
// ours, hence the `!` on the action button classes below.
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4 text-primary" />,
        info: <InfoIcon className="size-4 text-primary" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
          '--border-radius': 'var(--radius)',
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: 'cn-toast',
          actionButton:
            'bg-primary! text-primary-foreground! focus-visible:outline-2! focus-visible:outline-offset-2! focus-visible:outline-ring!',
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
