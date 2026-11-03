import { BUSINESS_PALETTE, contrastRatio } from '@repo/shared';
import { ColorPair } from './color-pair';
import { GallerySection, Subsection } from './gallery-section';

const COLOR_PAIRS = [
  {
    name: 'Page',
    background: 'background',
    foreground: 'foreground',
    use: 'Fond de page et texte courant',
  },
  {
    name: 'Carte',
    background: 'card',
    foreground: 'card-foreground',
    use: 'Cartes, fenêtres, champs',
  },
  {
    name: 'Texte secondaire',
    background: 'background',
    foreground: 'muted-foreground',
    use: 'Aides, légendes, durées',
  },
  {
    name: 'Sable',
    background: 'muted',
    foreground: 'foreground',
    use: 'Surfaces calmes, survol des menus',
  },
  {
    name: 'Principale',
    background: 'primary',
    foreground: 'primary-foreground',
    use: 'Boutons, liens, sélection. Change par établissement',
  },
  {
    name: 'Principale douce',
    background: 'primary-soft',
    foreground: 'foreground',
    use: 'Jour choisi, teintes de survol',
  },
  {
    name: 'Mise en avant',
    background: 'highlight',
    foreground: 'highlight-foreground',
    use: 'Domaine principal seulement, texte encre',
  },
  {
    name: 'Danger',
    background: 'background',
    foreground: 'destructive',
    use: 'Erreurs et suppressions',
  },
  {
    name: 'Confirmé, payé',
    background: 'status-confirmed-soft',
    foreground: 'status-confirmed',
    use: 'Statut de réservation',
  },
  {
    name: 'Terminé',
    background: 'status-done-soft',
    foreground: 'status-done',
    use: 'Statut de réservation',
  },
  {
    name: 'Absent',
    background: 'status-noshow-soft',
    foreground: 'status-noshow',
    use: 'Statut de réservation',
  },
  {
    name: 'Annulé',
    background: 'status-cancelled-soft',
    foreground: 'status-cancelled',
    use: 'Statut de réservation',
  },
];

const TYPE_SCALE = [
  {
    label: 'Titre de page',
    spec: '30 px, 36 px dès 768 px · 600',
    className: 'text-3xl md:text-4xl font-semibold',
    sample: 'Choisissez une prestation',
  },
  {
    label: 'Titre de section',
    spec: '24 px · 600',
    className: 'text-2xl font-semibold',
    sample: 'Vos prochains rendez-vous',
  },
  {
    label: 'Titre de carte',
    spec: '20 px · 600',
    className: 'text-xl font-semibold',
    sample: 'Coupe femme',
  },
  {
    label: 'Accroche',
    spec: '18 px · 400',
    className: 'text-lg',
    sample: 'Réservez en moins d’une minute, sans compte.',
  },
  {
    label: 'Corps et champs',
    spec: '16 px · 400',
    className: 'text-base',
    sample: 'Votre rendez-vous est confirmé pour mardi 3 novembre à 14:30.',
  },
  {
    label: 'Libellé',
    spec: '14 px · 500',
    className: 'text-sm font-medium',
    sample: 'Numéro de téléphone',
  },
  {
    label: 'Mention',
    spec: '12 px · 400',
    className: 'text-xs',
    sample: 'Réservation en ligne par MonRDV',
  },
];

const SPACING = [
  { size: 4, className: 'w-1', use: 'Icône et texte' },
  { size: 8, className: 'w-2', use: 'Éléments liés' },
  { size: 12, className: 'w-3', use: 'Dans un champ' },
  { size: 16, className: 'w-4', use: 'Marge de page sur téléphone' },
  { size: 24, className: 'w-6', use: 'Entre groupes, marge dès 768 px' },
  { size: 32, className: 'w-8', use: 'Entre blocs' },
  { size: 48, className: 'w-12', use: 'Entre sections' },
];

const RADII = [
  { label: '12 px', className: 'rounded-lg', use: 'Boutons, champs, menus' },
  { label: '16 px', className: 'rounded-xl', use: 'Cartes, fenêtres' },
  { label: 'Rond', className: 'rounded-full', use: 'Badges, pastilles' },
];

const ELEVATIONS = [
  { label: 'À plat', className: 'bg-background border', use: 'Fond de page' },
  { label: 'Filet', className: 'bg-card border', use: 'Cartes, champs' },
  {
    label: 'Ombre douce',
    className: 'bg-card shadow-lg',
    use: 'Menus, fenêtres, barre du bas',
  },
];

export function Foundations() {
  return (
    <GallerySection
      id="fondations"
      title="Fondations"
      lead="Un cadre clair et chaleureux. La couleur de l’établissement est la seule chose qui change d’une page à l’autre."
    >
      <Subsection
        title="Couleurs par rôle"
        lead="Chaque paire est mesurée dans le navigateur. Changez la couleur en haut de page : la paire principale se mesure à nouveau."
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {COLOR_PAIRS.map((pair) => (
            <ColorPair key={pair.name} {...pair} />
          ))}
        </div>
      </Subsection>

      <Subsection
        title="Palette des établissements"
        lead="Dix couleurs, toutes lisibles en texte blanc et sur le fond de page. Une couleur hors palette s’affiche en olive."
      >
        <div className="relative overflow-x-auto rounded-xl border bg-card">
          <table className="w-full text-sm">
            <caption className="sr-only">
              Contraste de chaque couleur de la palette
            </caption>
            <thead className="text-left text-muted-foreground">
              <tr className="border-b">
                <th scope="col" className="p-3 font-medium">
                  Couleur
                </th>
                <th scope="col" className="p-3 font-medium">
                  Valeur
                </th>
                <th scope="col" className="p-3 text-right font-medium">
                  Avec texte blanc
                </th>
                <th scope="col" className="p-3 text-right font-medium">
                  Sur le fond
                </th>
              </tr>
            </thead>
            <tbody>
              {BUSINESS_PALETTE.map((color) => (
                <tr key={color.hex} className="border-b last:border-b-0">
                  <th scope="row" className="p-3 text-left font-medium">
                    <span className="flex items-center gap-3">
                      <span
                        aria-hidden="true"
                        style={{ backgroundColor: color.hex }}
                        className="size-6 rounded-full"
                      />
                      {color.name}
                    </span>
                  </th>
                  <td className="p-3 font-mono text-xs">{color.hex}</td>
                  <td className="p-3 text-right tabular-nums">
                    {contrastRatio(color.hex, '#ffffff').toFixed(2)}:1
                  </td>
                  <td className="p-3 text-right tabular-nums">
                    {contrastRatio(color.hex, '#f4f1ea').toFixed(2)}:1
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Subsection>

      <Subsection
        title="Typographie"
        lead="IBM Plex Sans, une seule police. Les prix, heures et totaux utilisent des chiffres à largeur fixe."
      >
        <div className="relative overflow-x-auto rounded-xl border bg-card">
          <table className="w-full">
            <caption className="sr-only">Échelle typographique</caption>
            <thead className="text-left text-sm text-muted-foreground">
              <tr className="border-b">
                <th scope="col" className="p-3 font-medium">
                  Rôle
                </th>
                <th scope="col" className="p-3 font-medium">
                  Taille et graisse
                </th>
                <th scope="col" className="p-3 font-medium">
                  Exemple
                </th>
              </tr>
            </thead>
            <tbody>
              {TYPE_SCALE.map((row) => (
                <tr key={row.label} className="border-b last:border-b-0">
                  <th
                    scope="row"
                    className="p-3 text-left text-sm font-medium whitespace-nowrap"
                  >
                    {row.label}
                  </th>
                  <td className="p-3 text-sm whitespace-nowrap text-muted-foreground">
                    {row.spec}
                  </td>
                  <td className={`p-3 ${row.className}`}>{row.sample}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Subsection>

      <div className="grid gap-12 lg:grid-cols-3">
        <Subsection title="Espacement" lead="L’échelle de 4 px de Tailwind.">
          <ul className="flex flex-col gap-3">
            {SPACING.map((step) => (
              <li key={step.size} className="flex items-center gap-3 text-sm">
                <span className="w-10 text-right tabular-nums text-muted-foreground">
                  {step.size}
                </span>
                <span
                  aria-hidden="true"
                  className={`h-4 rounded-sm bg-primary ${step.className}`}
                />
                <span>{step.use}</span>
              </li>
            ))}
          </ul>
        </Subsection>

        <Subsection title="Arrondis" lead="Doux, jamais anguleux.">
          <ul className="flex flex-col gap-3">
            {RADII.map((radius) => (
              <li
                key={radius.label}
                className="flex items-center gap-4 text-sm"
              >
                <span
                  aria-hidden="true"
                  className={`size-12 border-2 border-primary bg-primary-soft ${radius.className}`}
                />
                <span className="flex flex-col">
                  <span className="font-medium">{radius.label}</span>
                  <span className="text-muted-foreground">{radius.use}</span>
                </span>
              </li>
            ))}
          </ul>
        </Subsection>

        <Subsection
          title="Élévation"
          lead="Les filets d’abord ; une seule ombre."
        >
          <ul className="flex flex-col gap-3">
            {ELEVATIONS.map((level) => (
              <li key={level.label} className="flex items-center gap-4 text-sm">
                <span
                  aria-hidden="true"
                  className={`h-12 w-16 rounded-lg ${level.className}`}
                />
                <span className="flex flex-col">
                  <span className="font-medium">{level.label}</span>
                  <span className="text-muted-foreground">{level.use}</span>
                </span>
              </li>
            ))}
          </ul>
        </Subsection>
      </div>
    </GallerySection>
  );
}
