import {
  ArrowRight,
  CalendarCheck,
  CalendarX2,
  Info,
  Plus,
} from 'lucide-react';
import { StatusBadge } from '@/components/booking/status-badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { GallerySection, Subsection } from './gallery-section';
import { OverlayDemos } from './overlay-demos';
import { StateMatrix, previewState } from './state-matrix';

const BUTTON_VARIANTS = [
  'default',
  'secondary',
  'outline',
  'ghost',
  'destructive',
  'link',
] as const;

const FIELD_STATES = [
  'default',
  'hover',
  'focus',
  'disabled',
  'invalid',
] as const;

export function ComponentsGallery() {
  return (
    <GallerySection
      id="composants"
      title="Composants"
      lead="Les briques shadcn/ui, aux couleurs de MonRDV. Chaque état est figé côte à côte pour la relecture ; tout reste utilisable au clavier."
    >
      <Subsection
        title="Bouton"
        lead="Une seule action principale par écran. Les autres sont en contour ou discrètes."
      >
        <StateMatrix
          caption="États des boutons par variante"
          rows={BUTTON_VARIANTS}
          states={[
            'default',
            'hover',
            'focus',
            'active',
            'disabled',
            'loading',
          ]}
          render={(variant, state) =>
            state === 'loading' ? (
              <Button variant={variant} disabled>
                <Spinner data-icon="inline-start" />
                Envoi…
              </Button>
            ) : (
              <Button variant={variant} {...previewState(state)}>
                Continuer
              </Button>
            )
          }
        />
        <div className="flex flex-wrap items-center gap-3">
          <Button size="xs">Très petit</Button>
          <Button size="sm">Petit</Button>
          <Button>Normal</Button>
          <Button size="lg">Grand</Button>
          <Button>
            <Plus data-icon="inline-start" />
            Ajouter une prestation
          </Button>
          <Button variant="outline">
            Voir les créneaux
            <ArrowRight data-icon="inline-end" />
          </Button>
          <Button size="icon" variant="outline" aria-label="Ajouter">
            <Plus />
          </Button>
        </div>
      </Subsection>

      <Subsection
        title="Badge et statuts"
        lead="Les statuts gardent les mêmes couleurs sur tous les établissements, jamais la couleur principale."
      >
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status="confirmed" />
          <StatusBadge status="done" />
          <StatusBadge status="no_show" />
          <StatusBadge status="cancelled" />
          <StatusBadge status="paid" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge>Nouveau</Badge>
          <Badge variant="secondary">45 min</Badge>
          <Badge variant="outline">Sur place</Badge>
          <Badge variant="destructive">Complet</Badge>
          <Badge variant="secondary" className="max-w-48">
            <span className="truncate">
              Coloration et soin profond kératine
            </span>
          </Badge>
        </div>
      </Subsection>

      <Subsection
        title="Champs"
        lead="Texte en 16 px, pour que le téléphone ne zoome pas. La bordure reste visible sur le blanc et sur le fond."
      >
        <StateMatrix
          caption="États des champs"
          rows={['input', 'select', 'textarea'] as const}
          states={FIELD_STATES}
          render={(row, state) => {
            const pinned = previewState(state);
            if (row === 'input') {
              return (
                <Input
                  aria-label={`Nom, état ${state}`}
                  name={`demo-matrix-name-${state}`}
                  autoComplete="off"
                  placeholder="Prénom et nom…"
                  className="w-48"
                  {...pinned}
                />
              );
            }
            if (row === 'select') {
              return (
                <Select>
                  <SelectTrigger
                    aria-label={`Prestation, état ${state}`}
                    className="w-48"
                    {...pinned}
                  >
                    <SelectValue placeholder="Choisir une prestation…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="coupe-femme">Coupe femme</SelectItem>
                      <SelectItem value="brushing">Brushing</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              );
            }
            return (
              <Textarea
                aria-label={`Note, état ${state}`}
                name={`demo-matrix-note-${state}`}
                autoComplete="off"
                placeholder="Une précision pour le salon…"
                className="w-48"
                {...pinned}
              />
            );
          }}
        />

        <div className="grid gap-8 md:grid-cols-2">
          <FieldGroup className="rounded-xl border bg-card p-5">
            <Field>
              <FieldLabel htmlFor="demo-name">Nom complet</FieldLabel>
              <Input
                id="demo-name"
                name="name"
                autoComplete="name"
                placeholder="Prénom et nom…"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="demo-phone">Téléphone</FieldLabel>
              <Input
                id="demo-phone"
                name="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="06 12 34 56 78…"
              />
              <FieldDescription>
                Nous vous envoyons la confirmation sur WhatsApp.
              </FieldDescription>
            </Field>
            <Field data-invalid>
              <FieldLabel htmlFor="demo-phone-error">Téléphone</FieldLabel>
              <Input
                id="demo-phone-error"
                name="phone-error"
                autoComplete="off"
                type="tel"
                defaultValue="06 12"
                aria-invalid
                aria-describedby="demo-phone-error-message"
              />
              <FieldError id="demo-phone-error-message">
                Ce numéro n’est pas un numéro marocain valide.
              </FieldError>
            </Field>
            <Field data-disabled>
              <FieldLabel htmlFor="demo-staff">Avec</FieldLabel>
              <Select disabled>
                <SelectTrigger id="demo-staff" className="w-full">
                  <SelectValue placeholder="Samira (seule disponible)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="samira">Samira</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
          </FieldGroup>

          <div className="flex flex-col gap-6 rounded-xl border bg-card p-5">
            <FieldSet>
              <FieldLegend variant="label">Rappel</FieldLegend>
              <RadioGroup defaultValue="whatsapp">
                <Field orientation="horizontal">
                  <RadioGroupItem value="whatsapp" id="demo-whatsapp" />
                  <FieldLabel htmlFor="demo-whatsapp" className="font-normal">
                    Par WhatsApp
                  </FieldLabel>
                </Field>
                <Field orientation="horizontal">
                  <RadioGroupItem value="sms" id="demo-sms" />
                  <FieldLabel htmlFor="demo-sms" className="font-normal">
                    Par SMS
                  </FieldLabel>
                </Field>
                <Field orientation="horizontal" data-disabled>
                  <RadioGroupItem value="email" id="demo-email" disabled />
                  <FieldLabel htmlFor="demo-email" className="font-normal">
                    Par e-mail (bientôt)
                  </FieldLabel>
                </Field>
              </RadioGroup>
            </FieldSet>
            <Separator />
            <FieldGroup className="gap-3">
              <Field orientation="horizontal">
                <Checkbox id="demo-terms" defaultChecked />
                <FieldLabel htmlFor="demo-terms" className="font-normal">
                  J’accepte de recevoir la confirmation
                </FieldLabel>
              </Field>
              <Field orientation="horizontal">
                <Checkbox id="demo-news" />
                <FieldLabel htmlFor="demo-news" className="font-normal">
                  Recevoir les nouveautés du salon
                </FieldLabel>
              </Field>
              <Field orientation="horizontal" data-invalid>
                <Checkbox id="demo-required" aria-invalid />
                <FieldLabel htmlFor="demo-required" className="font-normal">
                  Case obligatoire non cochée
                </FieldLabel>
              </Field>
              <Field orientation="horizontal" data-disabled>
                <Checkbox id="demo-disabled" disabled />
                <FieldLabel htmlFor="demo-disabled" className="font-normal">
                  Option indisponible
                </FieldLabel>
              </Field>
            </FieldGroup>
            <div className="flex items-center gap-3">
              <Label htmlFor="demo-focus-check" className="sr-only">
                Case au focus clavier
              </Label>
              <Checkbox id="demo-focus-check" data-preview="focus" />
              <span className="text-sm text-muted-foreground">
                Focus clavier figé
              </span>
            </div>
          </div>
        </div>
      </Subsection>

      <div className="grid gap-12 md:grid-cols-2">
        <Subsection title="Carte" lead="Fond blanc, filet, arrondi de 16 px.">
          <Card>
            <CardHeader>
              <CardTitle>Coupe femme</CardTitle>
              <CardDescription>Shampoing, coupe et coiffage.</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center gap-2 text-base">
              <Badge variant="secondary">45 min</Badge>
              <span className="font-semibold tabular-nums">120 DH</span>
            </CardContent>
            <CardFooter>
              <Button className="w-full">Choisir</Button>
            </CardFooter>
          </Card>
        </Subsection>

        <Subsection
          title="Chargement"
          lead="Squelettes pour les listes, indicateur pour les actions."
        >
          <Card
            role="status"
            aria-busy="true"
            aria-label="Chargement des prestations"
          >
            <CardHeader>
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-56" />
            </CardHeader>
            <CardContent className="flex gap-2">
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-6 w-20" />
            </CardContent>
            <CardFooter>
              <Skeleton className="h-11 w-full" />
            </CardFooter>
          </Card>
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Spinner />
            Recherche des créneaux…
          </p>
        </Subsection>
      </div>

      <div className="grid gap-12 md:grid-cols-2">
        <Subsection title="Alerte">
          <Alert>
            <Info />
            <AlertTitle>Le salon est fermé le 10 et le 11 mars</AlertTitle>
            <AlertDescription>
              Aïd al-Fitr. Les créneaux reprennent le 12 mars.
            </AlertDescription>
          </Alert>
          <Alert variant="destructive">
            <CalendarX2 />
            <AlertTitle>Ce créneau vient d’être pris</AlertTitle>
            <AlertDescription>
              Choisissez une autre heure, nous l’avons retiré de la liste.
            </AlertDescription>
          </Alert>
        </Subsection>

        <Subsection title="État vide">
          <Empty className="border bg-card">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <CalendarCheck />
              </EmptyMedia>
              <EmptyTitle>Aucun rendez-vous aujourd’hui</EmptyTitle>
              <EmptyDescription>
                Partagez votre lien de réservation pour remplir l’agenda.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button variant="outline">Copier mon lien</Button>
            </EmptyContent>
          </Empty>
        </Subsection>
      </div>

      <div className="grid gap-12 md:grid-cols-2">
        <Subsection
          title="Avatar et séparateur"
          lead="Sans photo, les initiales s’affichent."
        >
          <div className="flex items-center gap-4">
            <Avatar size="lg">
              <AvatarFallback>SA</AvatarFallback>
            </Avatar>
            <Avatar>
              <AvatarFallback>YC</AvatarFallback>
            </Avatar>
            <Separator orientation="vertical" className="h-8" />
            <div className="flex flex-col text-sm">
              <span className="font-medium">Samira</span>
              <span className="text-muted-foreground">Coiffeuse</span>
            </div>
          </div>
        </Subsection>

        <Subsection
          title="Fenêtres, panneaux, menus, notifications"
          lead="Ils s’ouvrent dans la couleur choisie en haut de page."
        >
          <OverlayDemos />
        </Subsection>
      </div>
    </GallerySection>
  );
}
