-- Fase 7 > Segurança: bug real encontrado pelo próprio teste de RLS.
--
-- `revoke all on function ... from public` só revoga o privilégio do
-- pseudo-role PUBLIC. Este projeto Supabase tem uma default privilege
-- (`alter default privileges ... grant execute on functions to anon,
-- authenticated, service_role`) que concede EXECUTE explicitamente a
-- `anon`/`authenticated` no momento da criação de CADA função nova — um
-- grant separado do de PUBLIC, que `revoke ... from public` não desfaz.
-- Resultado: as funções de job (geração/seleção/envio de push), que devem
-- ser exclusivas de service_role, continuavam chamáveis por qualquer
-- usuário autenticado. Corrigido revogando explicitamente de
-- anon/authenticated também — nunca só de public.

revoke all on function public.user_is_in_quiet_hours (uuid, timestamptz) from anon, authenticated;
revoke all on function public.generate_task_reminders () from anon, authenticated;
revoke all on function public.generate_water_reminders () from anon, authenticated;
revoke all on function public.generate_workout_reminders () from anon, authenticated;
revoke all on function public.generate_devotional_reminders () from anon, authenticated;
revoke all on function public.generate_daily_summary_notifications () from anon, authenticated;
revoke all on function public.generate_weekly_summary_notifications () from anon, authenticated;
revoke all on function public.generate_scheduled_notifications () from anon, authenticated;
revoke all on function public.select_due_push_notifications (integer) from anon, authenticated;
revoke all on function public.mark_push_notification_sent (uuid) from anon, authenticated;
revoke all on function public.mark_push_notification_failed (uuid, text) from anon, authenticated;
revoke all on function public.deactivate_push_subscription (uuid) from anon, authenticated;
