import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { BusinessMark } from '@/components/brand/business-mark';
import { Wordmark } from '@/components/brand/wordmark';
import { Main } from '@/components/shells/main';
import { env } from '@/env';
import { getCurrentOwner } from '@/lib/api/session';
import { getCurrentBusiness } from '@/lib/api/tenant';
import { emailSchema } from '@/lib/validation/login';
import { LoginForm } from './login-form';

// Blocks on the session, like the business layout blocks on the business.
export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  const business = await getCurrentBusiness();
  return {
    title: `Connexion · ${business?.name ?? 'MonRDV'}`,
    robots: { index: false },
  };
}

export default async function LoginPage({
  searchParams,
}: PageProps<'/sites/[subdomain]/connexion'>) {
  const business = await getCurrentBusiness();
  if (!business) notFound();
  if (await getCurrentOwner()) redirect('/dashboard');

  const { email } = await searchParams;
  const prefill = emailSchema.safeParse(email);

  return (
    <Main
      preview={false}
      className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-10"
    >
      <div className="flex w-full max-w-md flex-col gap-8 rounded-xl border bg-card p-6 md:p-8">
        <div className="flex flex-col gap-5">
          <div className="flex items-center gap-3">
            <BusinessMark name={business.name} />
            <p
              translate="no"
              className="min-w-0 text-lg leading-snug font-semibold break-words text-primary"
            >
              {business.name}
            </p>
          </div>
          <div className="flex flex-col gap-1.5">
            <h1 className="text-3xl font-semibold">Espace pro</h1>
            <p className="text-muted-foreground">
              Connectez-vous pour gérer vos rendez-vous.
            </p>
          </div>
        </div>
        <LoginForm initialEmail={prefill.success ? prefill.data : ''} />
        <p className="text-sm text-muted-foreground">
          Mot de passe oublié ? Écrivez-nous à contact@
          {env.NEXT_PUBLIC_ROOT_DOMAIN}.
        </p>
      </div>
      <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
        <Link
          href="/"
          className="rounded-sm underline-offset-4 hover:text-foreground hover:underline"
        >
          Retour à la page de réservation
        </Link>
        <p>
          Propulsé par <Wordmark className="text-sm text-foreground" />
        </p>
      </div>
    </Main>
  );
}
