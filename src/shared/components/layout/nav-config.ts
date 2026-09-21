import type { LucideIcon } from "lucide-react";
import { CalendarRange, Home, Inbox, Settings } from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

/**
 * Itens de navegação principal. A navegação completa da especificação
 * (Saúde, Espiritual, Financeiro, Negócios, Progresso) será adicionada
 * aqui, um item por vez, conforme cada domínio for implementado nas
 * próximas fases — nunca expor um item para uma rota que ainda não existe
 * (CLAUDE.md > REGRA SOBRE PLACEHOLDERS).
 */
export const NAV_ITEMS: NavItem[] = [
  { label: "Hoje", href: "/", icon: Home },
  { label: "Planejamento", href: "/planejamento", icon: CalendarRange },
  { label: "Inbox", href: "/inbox", icon: Inbox },
  { label: "Configurações", href: "/configuracoes", icon: Settings },
];
