-- Mesma ergonomia/defesa em profundidade da Fase 1 (ver
-- 20260922011200_default_user_id_auth_uid.sql) aplicada às tabelas novas da
-- Fase 2: já é redundante com o `default auth.uid()` declarado direto nas
-- tabelas criadas nesta fase, mas mantém o padrão explícito de uma migration
-- dedicada para essa garantia, e cobre bmi_records/body_measurements que
-- foram criadas sem o default inline.

alter table public.body_measurements alter column user_id set default auth.uid ();
alter table public.bmi_records alter column user_id set default auth.uid ();
