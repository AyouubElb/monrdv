'use client';

import { Menu } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

/**
 * Below 1024px: the top bar's menu button, opening the menu in a Sheet. The menu arrives as
 * `children`, already rendered on the server.
 */
export function DashboardMenuButton({
  businessName,
  children,
  footer,
}: {
  businessName: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Ouvrir le menu"
          className="-ml-2"
        >
          <Menu />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72">
        <SheetHeader>
          <SheetTitle>Menu</SheetTitle>
          <SheetDescription>{businessName}</SheetDescription>
        </SheetHeader>
        <nav aria-label="Menu principal" className="px-4">
          {children}
        </nav>
        {footer && <div className="mt-auto border-t p-4">{footer}</div>}
      </SheetContent>
    </Sheet>
  );
}
