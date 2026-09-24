import type { SupabaseClient } from "@supabase/supabase-js";

import { fetchAllRows } from "@/shared/lib/export/paginate";

import { BACKUP_SCHEMA_VERSION, type BackupPayload } from "../types/backup";

/**
 * Uma linha por tabela do usuário incluída no backup, agrupada por domínio
 * de negócio (mesma organização por domínio do resto do app — nunca uma
 * lista técnica plana de nomes de tabela). Cada fetch é RLS-escopado pela
 * sessão (auth.uid()) — nenhuma tabela aqui aceita um userId vindo de
 * fora, e nenhuma delas é lida com service_role.
 *
 * Excluídas de propósito (CLAUDE.md > Auditoria > Exportação):
 * - push_subscriptions: chaves de dispositivo, não "dado do usuário" para
 *   preservar — restaurar um backup nunca deveria reativar push em um
 *   dispositivo que pode nem existir mais.
 * - scheduled_notifications: fila interna de job, efêmera por natureza,
 *   sem valor de backup (o próximo ciclo do scheduler já recria o que for
 *   relevante).
 */
const TABLE_CONFIG: { table: string; domain: string; key: string }[] = [
  { table: "profiles", domain: "perfil", key: "perfil" },
  { table: "life_areas", domain: "perfil", key: "areas_de_vida" },
  {
    table: "notification_preferences",
    domain: "preferencias",
    key: "preferencias_notificacao",
  },

  { table: "tasks", domain: "tarefas_habitos", key: "tarefas" },
  {
    table: "task_recurrences",
    domain: "tarefas_habitos",
    key: "recorrencias_tarefas",
  },
  { table: "habits", domain: "tarefas_habitos", key: "habitos" },
  { table: "habit_logs", domain: "tarefas_habitos", key: "registros_habitos" },
  { table: "weekly_plans", domain: "planejamento", key: "planos_semanais" },
  { table: "goals", domain: "planejamento", key: "metas" },
  { table: "daily_reviews", domain: "planejamento", key: "revisoes_diarias" },
  { table: "inbox_items", domain: "planejamento", key: "inbox" },

  { table: "weight_logs", domain: "saude", key: "peso" },
  { table: "weight_goals", domain: "saude", key: "metas_peso" },
  { table: "body_measurements", domain: "saude", key: "medidas" },
  { table: "bmi_records", domain: "saude", key: "imc" },
  { table: "water_settings", domain: "saude", key: "config_agua" },
  { table: "water_logs", domain: "saude", key: "registros_agua" },
  { table: "walk_logs", domain: "saude", key: "caminhadas" },
  { table: "meal_plans", domain: "saude", key: "planos_alimentares" },
  { table: "meal_logs", domain: "saude", key: "registros_refeicoes" },
  { table: "workout_plans", domain: "saude", key: "planos_treino" },
  { table: "workout_exercises", domain: "saude", key: "exercicios_treino" },
  { table: "workout_sessions", domain: "saude", key: "sessoes_treino" },
  { table: "exercise_sets", domain: "saude", key: "series_treino" },

  { table: "devotionals", domain: "espiritual", key: "devocionais" },
  { table: "bible_study_notes", domain: "espiritual", key: "notas_estudo" },
  { table: "reading_plans", domain: "espiritual", key: "planos_leitura" },
  {
    table: "reading_plan_logs",
    domain: "espiritual",
    key: "registros_leitura",
  },
  { table: "prayers", domain: "espiritual", key: "oracoes" },
  { table: "saved_verses", domain: "espiritual", key: "versiculos_salvos" },

  { table: "finance_accounts", domain: "financeiro", key: "contas" },
  { table: "finance_categories", domain: "financeiro", key: "categorias" },
  { table: "finance_transactions", domain: "financeiro", key: "transacoes" },
  { table: "finance_recurrences", domain: "financeiro", key: "recorrencias" },
  { table: "finance_budgets", domain: "financeiro", key: "orcamentos" },
  {
    table: "finance_budget_alerts",
    domain: "financeiro",
    key: "alertas_orcamento",
  },

  { table: "businesses", domain: "negocios", key: "negocios" },
  { table: "customers", domain: "negocios", key: "clientes" },
  {
    table: "customer_interactions",
    domain: "negocios",
    key: "interacoes_clientes",
  },
  { table: "catalog_items", domain: "negocios", key: "catalogo" },
  { table: "offers", domain: "negocios", key: "ofertas" },
  { table: "offer_items", domain: "negocios", key: "itens_oferta" },
  { table: "sales", domain: "negocios", key: "vendas" },
  { table: "sale_items", domain: "negocios", key: "itens_venda" },
  {
    table: "sale_status_changes",
    domain: "negocios",
    key: "historico_status_venda",
  },
  { table: "inventory_settings", domain: "negocios", key: "config_estoque" },
  {
    table: "inventory_movements",
    domain: "negocios",
    key: "movimentos_estoque",
  },

  { table: "xp_events", domain: "progresso", key: "eventos_xp" },
  { table: "rewards", domain: "progresso", key: "recompensas" },
  { table: "reward_redemptions", domain: "progresso", key: "resgates" },
  { table: "user_achievements", domain: "progresso", key: "conquistas" },
  { table: "weekly_reviews", domain: "progresso", key: "revisoes_semanais" },

  { table: "notifications", domain: "notificacoes", key: "historico_in_app" },
];

/** user_id é o mesmo valor (o dono do backup) em toda linha — removido do
 * JSON pra não repetir um identificador redundante em milhares de linhas.
 * `id` (chave primária de cada registro) é preservado — é o que permitiria
 * uma futura ferramenta de restauração religar relacionamentos. */
function stripUserId(row: Record<string, unknown>): Record<string, unknown> {
  const rest = { ...row };
  delete rest.user_id;
  return rest;
}

/**
 * Monta o backup JSON completo do usuário autenticado. Nunca recebe um
 * userId de fora — cada tabela é lida com o client autenticado normal do
 * app (RLS escopa pra `auth.uid()`), o mesmo client usado em toda leitura
 * do resto do produto. Pagina cada tabela (fetchAllRows) pra nunca
 * truncar silenciosamente um histórico grande.
 */
export async function buildUserBackup(
  supabase: SupabaseClient,
): Promise<BackupPayload> {
  const domains: BackupPayload["domains"] = {};

  await Promise.all(
    TABLE_CONFIG.map(async ({ table, domain, key }) => {
      const rows = await fetchAllRows<Record<string, unknown>>(
        async (from, to) => {
          const result = await supabase.from(table).select("*").range(from, to);
          return result as {
            data: Record<string, unknown>[] | null;
            error: { message: string } | null;
          };
        },
      );

      domains[domain] ??= {};
      domains[domain][key] = rows.map(stripUserId);
    }),
  );

  return {
    backupFormat: "meu-app-vida-backup",
    schemaVersion: BACKUP_SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    domains,
    notes: [
      "Backup de leitura — não existe importação/restauração automática nesta versão.",
      "push_subscriptions e scheduled_notifications não são incluídos (dado técnico/efêmero, sem valor de backup).",
      "sale_status_changes é o histórico de transição de status de vendas — restaurar vendas sem também restaurar este histórico na ordem correta pode deixar o rastro de auditoria incompleto.",
      "Valores monetários estão como vieram do Postgres (numeric, string decimal) — nunca convertidos para float.",
    ],
  };
}
