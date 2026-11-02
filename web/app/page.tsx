// Platform home placeholder on the root domain (the proxy sends business subdomains to
// `app/sites/`). The landing page (scope feature 13) replaces it.
export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center gap-2 p-8">
      <p className="text-sm text-zinc-600">Plateforme de réservation</p>
      <h1 className="text-2xl font-semibold">MonRDV</h1>
    </main>
  );
}
