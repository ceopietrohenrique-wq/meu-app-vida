import { NAV_ITEMS } from "./nav-config";
import { NavLink } from "./nav-link";

/** Sidebar de desktop (md e acima). Ver bottom-nav.tsx para o mobile. */
export function AppSidebar() {
  return (
    <aside className="bg-sidebar text-sidebar-foreground hidden w-56 shrink-0 flex-col gap-1 border-r p-4 md:flex">
      <div className="mb-4 px-2 text-sm font-semibold tracking-tight">
        Minha Vida
      </div>
      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.href}
            href={item.href}
            label={item.label}
            icon={<item.icon className="size-5" aria-hidden="true" />}
            className="flex items-center gap-3 rounded-md px-2 py-2 text-sm font-medium transition-colors"
            activeClassName="bg-sidebar-accent text-sidebar-accent-foreground"
            inactiveClassName="text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          />
        ))}
      </nav>
    </aside>
  );
}
