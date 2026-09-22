import { QuickCaptureButton } from "@/shared/components/quick-capture/quick-capture-button";

import { MenuSheet } from "./menu-sheet";
import { NAV_ITEMS } from "./nav-config";
import { NavLink } from "./nav-link";

/**
 * Navegação inferior de mobile (abaixo de md): Hoje · Planejamento · (+) ·
 * Progresso · Menu (CLAUDE.md > NAVEGAÇÃO) — as 5 posições agora são todas
 * reais (Progresso existe desde a Fase 6; Menu agrupa o resto via
 * `MenuSheet`).
 */
export function BottomNav() {
  const bottomNavItems = NAV_ITEMS.filter(
    (item) => item.showInBottomNav !== false,
  );
  const [first, second, third] = bottomNavItems;

  return (
    <nav
      className="bg-background/95 supports-[backdrop-filter]:bg-background/80 fixed inset-x-0 bottom-0 z-40 flex items-center border-t backdrop-blur md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {[first, second].map(
        (item) =>
          item && (
            <NavLink
              key={item.href}
              href={item.href}
              label={item.label}
              icon={<item.icon className="size-5" aria-hidden="true" />}
              className="flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium [&>span]:leading-none"
              activeClassName="text-primary"
              inactiveClassName="text-muted-foreground"
            />
          ),
      )}

      <div className="flex flex-1 items-center justify-center py-1.5">
        <QuickCaptureButton />
      </div>

      {third && (
        <NavLink
          key={third.href}
          href={third.href}
          label={third.label}
          icon={<third.icon className="size-5" aria-hidden="true" />}
          className="flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium [&>span]:leading-none"
          activeClassName="text-primary"
          inactiveClassName="text-muted-foreground"
        />
      )}

      <MenuSheet />
    </nav>
  );
}
