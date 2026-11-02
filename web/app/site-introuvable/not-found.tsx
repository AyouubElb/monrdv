import { env } from '@/env';
import { rootUrl } from '@/lib/root-url';

// The tab title is set in `layout.tsx` beside this file.
export default function BusinessNotFound() {
  const rootDomain = env.NEXT_PUBLIC_ROOT_DOMAIN;
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center gap-4 p-8">
      <h1 className="text-2xl font-semibold">
        Cette adresse ne correspond à aucun établissement
      </h1>
      <p className="text-zinc-700">
        Vérifiez l’adresse saisie, ou créez la page de votre établissement.
      </p>
      <ul className="flex flex-wrap gap-x-6 gap-y-2">
        <li>
          <a
            className="underline underline-offset-4"
            href={rootUrl('/', rootDomain)}
          >
            Retour à l’accueil
          </a>
        </li>
        <li>
          <a
            className="font-medium underline underline-offset-4"
            href={rootUrl('/inscription', rootDomain)}
          >
            Créez votre page
          </a>
        </li>
      </ul>
    </main>
  );
}
