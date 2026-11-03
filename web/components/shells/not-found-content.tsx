import { SearchX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';

/** The body of a 404 page, inside `PlatformShell`. */
export function NotFoundContent({
  title,
  text,
  homeHref,
  signupHref,
}: {
  title: string;
  text: string;
  homeHref: string;
  signupHref: string;
}) {
  return (
    <Empty className="my-12 border bg-card md:my-20">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <SearchX />
        </EmptyMedia>
        <EmptyTitle>
          <h1 className="text-2xl">{title}</h1>
        </EmptyTitle>
        <EmptyDescription>{text}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent className="flex-row flex-wrap justify-center">
        <Button variant="outline" asChild>
          <a href={homeHref}>Retour à l’accueil</a>
        </Button>
        <Button asChild>
          <a href={signupHref}>Créez votre page</a>
        </Button>
      </EmptyContent>
    </Empty>
  );
}
