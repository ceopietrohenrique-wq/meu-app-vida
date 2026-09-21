import type { LucideIcon } from "lucide-react";
import { Home, Settings } from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

/**
 * Itens de navegação principal. A navegação completa da especificação
 * (Planejamento, Saúde, Espiritual, Financeiro, Negócios, Progresso, Inbox)
 * será adicionada aqui, um item por vez, conforme cada domínio for
 * implementado nas próximas fases — nunca expor um item para uma rota que
 * ainda não existe (CLAUDE.md > REGRA SOBRE PLACEHOLDERS).
 */
export const NAV_ITEMS: NavItem[] = [
  { label: "Hoje", href: "/", icon: Home },
  { label: "Configurações", href: "/configuracoes", icon: Settings },
];
