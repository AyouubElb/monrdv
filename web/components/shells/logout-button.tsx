'use client';

import { LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { apiFetch } from '@/lib/api/client';

export function LogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);

  async function logout() {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);

    const result = await apiFetch('/api/auth/logout', { method: 'POST' });
    // A 401 means the session is already gone: same landing as a logout.
    if (result.ok || result.error.statusCode === 401) {
      router.replace('/connexion');
      router.refresh();
      return;
    }
    inFlight.current = false;
    setBusy(false);
    toast.error(result.error.message);
  }

  return (
    <Button
      type="button"
      variant="ghost"
      onClick={() => void logout()}
      disabled={busy}
      className="h-11 w-full justify-start gap-3 px-3 text-base font-medium text-muted-foreground hover:text-foreground"
    >
      {busy ? <Spinner /> : <LogOut aria-hidden="true" className="size-5" />}
      Se déconnecter
    </Button>
  );
}
