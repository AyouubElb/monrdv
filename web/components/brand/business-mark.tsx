import { cn } from '@/lib/utils';

/** "Salon Atlas" → "SA", "Coach Karim" → "CK", "Zen" → "Z". */
export function businessInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('');
}

/**
 * The business mark: its initials, white on the accent color. The logo replaces it once
 * business branding (scope feature 12) adds one. Decorative: the name always sits beside it.
 */
export function BusinessMark({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary text-base font-semibold text-primary-foreground',
        className,
      )}
    >
      {businessInitials(name)}
    </span>
  );
}
