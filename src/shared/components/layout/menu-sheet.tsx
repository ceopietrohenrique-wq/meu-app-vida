"use client";

import { Menu as MenuIcon } from "lucide-react";
import { useState } from "react";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/shared/components/ui/sheet";

import { NAV_ITEMS } from "./nav-config";
import { NavLink } from "./nav-link";

/**
 * 5º slot da bottom nav mobile (CLAUDE.md > NAVEGAÇÃO): agrupa os domínios
 * sem slot fixo próprio (Saúde, Espiritual, Financeiro, Negócios) mais
 * Inbox/Configurações — mesmos itens já visíveis na sidebar de desktop,
 * só reorganizados para caber nas 5 posições do mobile.
 */
export function MenuSheet() {
  const [open, setOpen] = useState(false);
  const menuItems = NAV_ITEMS.filter((item) => item.showInBottomNav === false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <button
            type="button"
            className="text-muted-foreground flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium [&>span]:leading-none"
            aria-label="Menu"
          >
            <MenuIcon className="size-5" aria-hidden="true" />
            <span>Menu</span>
          </button>
        }
      />
      <SheetContent side="bottom">
        <SheetHeader>
          <SheetTitle>Menu</SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col gap-1 p-4 pt-0">
          {menuItems.map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              label={item.label}
              icon={<item.icon className="size-5" aria-hidden="true" />}
              className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium"
              activeClassName="bg-muted text-foreground"
              inactiveClassName="text-muted-foreground"
              onNavigate={() => setOpen(false)}
            />
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
