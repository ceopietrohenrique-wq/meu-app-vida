import { QuickCaptureButton } from "@/shared/components/quick-capture/quick-capture-button";

import { NAV_ITEMS } from "./nav-config";
import { NavLink } from "./nav-link";

/**
 * Navegação inferior de mobile (abaixo de md). A especificação prevê 5
 * posições (Hoje · Planejamento · (+) · Progresso · Menu); Progresso e Menu
 * ainda não existem como telas próprias, então os slots 4 e 5 usam Inbox e
 * Configurações — as únicas rotas reais equivalentes até aqui.
 */
export function BottomNav() {
  const [first, second, ...rest] = NAV_ITEMS;

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

      {rest.map((item) => (
        <NavLink
          key={item.href}
          href={item.href}
          label={item.label}
          icon={<item.icon className="size-5" aria-hidden="true" />}
          className="flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium [&>span]:leading-none"
          activeClassName="text-primary"
          inactiveClassName="text-muted-foreground"
        />
      ))}
    </nav>
  );
}
