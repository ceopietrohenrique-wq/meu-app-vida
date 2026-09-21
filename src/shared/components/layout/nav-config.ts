import type { LucideIcon } from "lucide-react";
import { CalendarRange, Heart, Home, Inbox, Settings } from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  /**
   * A bottom nav de mobile só tem 5 posições fixas (Hoje · Planejamento ·
   * (+) · Progresso · Menu — CLAUDE.md > NAVEGAÇÃO). Itens de domínio que
   * ainda não têm slot próprio nessa lista (ex.: Saúde, antes de existir
   * "Menu") ficam de fora do bottom nav e continuam acessíveis pela
   * sidebar de desktop. Default: aparece nos dois.
   */
  showInBottomNav?: boolean;
};

/**
 * Itens de navegação principal. A navegação completa da especificação
 * (Espiritual, Financeiro, Negócios, Progresso) será adicionada aqui, um
 * item por vez, conforme cada domínio for implementado nas próximas fases —
 * nunca expor um item para uma rota que ainda não existe (CLAUDE.md >
 * REGRA SOBRE PLACEHOLDERS).
 */
export const NAV_ITEMS: NavItem[] = [
  { label: "Hoje", href: "/", icon: Home },
  { label: "Planejamento", href: "/planejamento", icon: CalendarRange },
  { label: "Saúde", href: "/saude", icon: Heart, showInBottomNav: false },
  { label: "Inbox", href: "/inbox", icon: Inbox },
  { label: "Configurações", href: "/configuracoes", icon: Settings },
];
