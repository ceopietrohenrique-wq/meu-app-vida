-- Fase 7 > bug real encontrado pela suíte de RLS: `create or replace
-- function` com um parâmetro NOVO (mesmo com default) não substitui a
-- função existente — cria uma SEGUNDA função (overload), porque a lista de
-- tipos de parâmetro mudou. A migration 20260929010400 pretendia estender
-- get_progress_summary/get_weekly_review_snapshot com p_user_id, mas na
-- prática deixou as duas versões (1 e 2 argumentos) coexistindo, e o
-- PostgREST não consegue decidir qual chamar quando o client manda só
-- p_week_start/p_period_start+p_period_end — erro real: "Could not choose
-- the best candidate function". Corrigido removendo a assinatura antiga —
-- só a versão com p_user_id (default auth.uid()) deve existir.

drop function if exists public.get_weekly_review_snapshot (date);
drop function if exists public.get_progress_summary (date, date);
