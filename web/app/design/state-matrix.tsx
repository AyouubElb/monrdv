import type { ReactNode } from 'react';

// Shows one component in every state side by side, without interaction (shadcn design system
// page helper). `previewState` pins hover, focus, and pressed through `data-preview`, which the
// variants in `globals.css` match.

export type PreviewState =
  'default' | 'hover' | 'focus' | 'active' | 'disabled' | 'invalid' | 'loading';

const STATE_LABELS: Record<PreviewState, string> = {
  default: 'Repos',
  hover: 'Survol',
  focus: 'Focus clavier',
  active: 'Appuyé',
  disabled: 'Désactivé',
  invalid: 'Erreur',
  loading: 'Chargement',
};

export function StateMatrix<Row extends string>({
  caption,
  rows,
  states,
  render,
}: {
  caption: string;
  rows: readonly Row[];
  states: readonly PreviewState[];
  render: (row: Row, state: PreviewState) => ReactNode;
}) {
  return (
    <div className="relative w-full overflow-x-auto">
      <table className="border-separate border-spacing-x-3 border-spacing-y-3">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            <td />
            {states.map((state) => (
              <th
                key={state}
                scope="col"
                className="text-left text-xs font-medium text-muted-foreground"
              >
                {STATE_LABELS[state]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row}>
              <th
                scope="row"
                className="pr-2 text-left font-mono text-xs font-normal text-muted-foreground"
              >
                {row}
              </th>
              {states.map((state) => (
                <td key={state}>{render(row, state)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Spread onto a component to pin a state. */
export function previewState(state: PreviewState) {
  if (state === 'disabled') return { disabled: true };
  if (state === 'invalid') return { 'aria-invalid': true };
  if (state === 'hover' || state === 'focus' || state === 'active') {
    return { 'data-preview': state };
  }
  return {};
}
