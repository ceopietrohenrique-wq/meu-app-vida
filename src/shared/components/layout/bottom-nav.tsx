import { NAV_ITEMS } from "./nav-config";
import { NavLink } from "./nav-link";

/**
 * Navegação inferior de mobile (abaixo de md). A especificação prevê 5
 * posições (Hoje · Planejamento · (+) · Progresso · Menu); na Fase 0 só
 * Hoje e Configurações existem de fato — os demais slots entram junto com
 * seus domínios.
 */
export function BottomNav() {
  return (
    <nav
      className="bg-background/95 supports-[backdrop-filter]:bg-background/80 fixed inset-x-0 bottom-0 z-40 flex border-t backdrop-blur md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {NAV_ITEMS.map((item) => (
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
