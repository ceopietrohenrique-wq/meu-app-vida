-- Ergonomia + defesa em profundidade: o client nunca precisa (nem deve)
-- enviar user_id manualmente em INSERTs — o banco preenche com auth.uid().
-- A policy WITH CHECK (auth.uid() = user_id) continua valendo mesmo assim,
-- então um valor explícito divergente ainda seria rejeitado.

alter table public.life_areas alter column user_id set default auth.uid ();
alter table public.xp_events alter column user_id set default auth.uid ();
alter table public.goals alter column user_id set default auth.uid ();
alter table public.task_recurrences alter column user_id set default auth.uid ();
alter table public.tasks alter column user_id set default auth.uid ();
alter table public.habits alter column user_id set default auth.uid ();
alter table public.habit_logs alter column user_id set default auth.uid ();
alter table public.weekly_plans alter column user_id set default auth.uid ();
alter table public.inbox_items alter column user_id set default auth.uid ();
alter table public.notifications alter column user_id set default auth.uid ();
alter table public.daily_reviews alter column user_id set default auth.uid ();
