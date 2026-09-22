import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  Briefcase,
  CalendarRange,
  Heart,
  Home,
  Inbox,
  Settings,
  TrendingUp,
  Wallet,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  /**
   * A bottom nav de mobile tem 5 posições fixas: Hoje · Planejamento · (+) ·
   * Progresso · Menu (CLAUDE.md > NAVEGAÇÃO). "Progresso" existe desde a
   * Fase 6 e ocupa o 4º slot de verdade; os itens com
   * `showInBottomNav: false` (Saúde/Espiritual/Financeiro/Negócios/Inbox/
   * Configurações) ficam agrupados no 5º slot, "Menu" (ver
   * `menu-sheet.tsx`) — nunca escondidos, só reorganizados. Default:
   * aparece direto na bottom nav.
   */
  showInBottomNav?: boolean;
};

/** Ordem = mesma ordem da sidebar de desktop (CLAUDE.md > NAVEGAÇÃO). */
export const NAV_ITEMS: NavItem[] = [
  { label: "Hoje", href: "/", icon: Home },
  { label: "Planejamento", href: "/planejamento", icon: CalendarRange },
  { label: "Saúde", href: "/saude", icon: Heart, showInBottomNav: false },
  {
    label: "Espiritual",
    href: "/espiritual",
    icon: BookOpen,
    showInBottomNav: false,
  },
  {
    label: "Financeiro",
    href: "/financeiro",
    icon: Wallet,
    showInBottomNav: false,
  },
  {
    label: "Negócios",
    href: "/negocios",
    icon: Briefcase,
    showInBottomNav: false,
  },
  { label: "Progresso", href: "/progresso", icon: TrendingUp },
  { label: "Inbox", href: "/inbox", icon: Inbox, showInBottomNav: false },
  {
    label: "Configurações",
    href: "/configuracoes",
    icon: Settings,
    showInBottomNav: false,
  },
];
