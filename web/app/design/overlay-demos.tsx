'use client';

import { CalendarX, LogOut, Pencil, Settings, User } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

/** Real triggers for the overlays. They open in the current accent color. */
export function OverlayDemos() {
  return (
    <div className="flex flex-wrap gap-3">
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline">Ouvrir une fenêtre</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Annuler ce rendez-vous ?</DialogTitle>
            <DialogDescription>
              Coupe femme avec Samira, mardi 3 novembre à 14:30. Le client
              reçoit un message WhatsApp.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Garder</Button>
            </DialogClose>
            <DialogClose asChild>
              <Button>
                <CalendarX data-icon="inline-start" />
                Annuler le rendez-vous
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline">Ouvrir un panneau</Button>
        </SheetTrigger>
        <SheetContent side="right">
          <SheetHeader>
            <SheetTitle>Réservation ATL-7K3Q</SheetTitle>
            <SheetDescription>Amina Benali · 06 12 34 56 78</SheetDescription>
          </SheetHeader>
          <div className="flex flex-col gap-1 px-4 text-sm">
            <p className="font-medium">Coupe femme, 45 min</p>
            <p className="text-muted-foreground">Mardi 3 novembre, 14:30</p>
          </div>
          <SheetFooter>
            <Button>Marquer comme payé</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline">
            <User data-icon="inline-start" />
            Mon compte
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuLabel>Salon Atlas</DropdownMenuLabel>
          <DropdownMenuGroup>
            <DropdownMenuItem>
              <Pencil />
              Modifier ma page
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings />
              Réglages
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem variant="destructive">
              <LogOut />
              Se déconnecter
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <Button
        variant="outline"
        onClick={() =>
          toast.success('Rendez-vous confirmé', {
            description: 'Mardi 3 novembre à 14:30 avec Samira.',
            action: { label: 'Voir', onClick: () => {} },
          })
        }
      >
        Afficher une notification
      </Button>
    </div>
  );
}
