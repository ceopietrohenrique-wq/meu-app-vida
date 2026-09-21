-- Encerramento do dia (escopo Fase 1). Ver docs/database.md > daily_reviews.

create table public.daily_reviews (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  tasks_completed integer not null default 0 check (tasks_completed >= 0),
  tasks_total integer not null default 0 check (tasks_total >= 0),
  xp_earned integer not null default 0 check (xp_earned >= 0),
  carry_over_note text,
  created_at timestamptz not null default now(),
  unique (user_id, date)
);

alter table public.daily_reviews enable row level security;

create policy daily_reviews_select_own
  on public.daily_reviews
  for select
  using (auth.uid () = user_id);

create policy daily_reviews_insert_own
  on public.daily_reviews
  for insert
  with check (auth.uid () = user_id);

create policy daily_reviews_update_own
  on public.daily_reviews
  for update
  using (auth.uid () = user_id)
  with check (auth.uid () = user_id);

create policy daily_reviews_delete_own
  on public.daily_reviews
  for delete
  using (auth.uid () = user_id);
