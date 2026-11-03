import { Badge } from '@/components/ui/badge';

/** A booking status (spec 0003 `BookingStatus`), plus `paid` for the cash payment. */
export type BadgeStatus =
  'confirmed' | 'done' | 'no_show' | 'cancelled' | 'paid';

const STATUS_LABELS: Record<BadgeStatus, string> = {
  confirmed: 'Confirmé',
  done: 'Terminé',
  no_show: 'Absent',
  cancelled: 'Annulé',
  paid: 'Payé',
};

/** The status in its fixed color, the same on every business. The label carries the meaning. */
export function StatusBadge({ status }: { status: BadgeStatus }) {
  return <Badge variant={status}>{STATUS_LABELS[status]}</Badge>;
}
