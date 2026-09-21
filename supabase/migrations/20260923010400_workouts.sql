-- Saúde > Treino. Ver docs/database.md > Fase 2 > workout_plans/exercises/
-- sessions/sets. Tela de treino precisa ser rápida no celular — o modelo
-- separa o PLANO (workout_plans/workout_exercises, editado com calma) da
-- EXECUÇÃO (workout_sessions/exercise_sets, poucos cliques durante o treino).

create table public.workout_plans (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid (),
  name text not null,
  muscle_groups text,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index workout_plans_user_id_idx on public.workout_plans (user_id);

create trigger workout_plans_set_updated_at
before update on public.workout_plans
for each row
execute function public.set_updated_at();

alter table public.workout_plans enable row level security;

create policy workout_plans_select_own
  on public.workout_plans for select using (auth.uid () = user_id);

create policy workout_plans_insert_own
  on public.workout_plans for insert with check (auth.uid () = user_id);

create policy workout_plans_update_own
  on public.workout_plans for update using (auth.uid () = user_id) with check (auth.uid () = user_id);

create policy workout_plans_delete_own
  on public.workout_plans for delete using (auth.uid () = user_id);

create table public.workout_exercises (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid (),
  workout_plan_id uuid not null references public.workout_plans (id) on delete cascade,
  name text not null,
  muscle_group text,
  order_index integer not null default 0,
  planned_sets integer check (planned_sets is null or planned_sets > 0),
  planned_reps text,
  planned_load_kg numeric check (planned_load_kg is null or planned_load_kg >= 0),
  rest_seconds integer check (rest_seconds is null or rest_seconds >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index workout_exercises_plan_id_idx
  on public.workout_exercises (workout_plan_id, order_index);

create trigger workout_exercises_set_updated_at
before update on public.workout_exercises
for each row
execute function public.set_updated_at();

alter table public.workout_exercises enable row level security;

create policy workout_exercises_select_own
  on public.workout_exercises for select using (auth.uid () = user_id);

create policy workout_exercises_insert_own
  on public.workout_exercises for insert with check (auth.uid () = user_id);

create policy workout_exercises_update_own
  on public.workout_exercises for update using (auth.uid () = user_id) with check (auth.uid () = user_id);

create policy workout_exercises_delete_own
  on public.workout_exercises for delete using (auth.uid () = user_id);

-- Uma sessão = uma execução real do plano num dia. completed_at nulo =
-- treino em andamento/aberto.
create table public.workout_sessions (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid (),
  workout_plan_id uuid references public.workout_plans (id) on delete set null,
  date date not null,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  notes text,
  created_at timestamptz not null default now()
);

create index workout_sessions_user_id_date_idx on public.workout_sessions (user_id, date);

alter table public.workout_sessions enable row level security;

create policy workout_sessions_select_own
  on public.workout_sessions for select using (auth.uid () = user_id);

create policy workout_sessions_insert_own
  on public.workout_sessions for insert with check (auth.uid () = user_id);

create policy workout_sessions_update_own
  on public.workout_sessions for update using (auth.uid () = user_id) with check (auth.uid () = user_id);

create policy workout_sessions_delete_own
  on public.workout_sessions for delete using (auth.uid () = user_id);

-- Cada série é uma linha própria (carga, repetições, ordem) — registrado
-- rapidamente durante o treino. Ex.: 80kg x 10, 80kg x 9, 75kg x 11.
create table public.exercise_sets (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid (),
  workout_session_id uuid not null references public.workout_sessions (id) on delete cascade,
  workout_exercise_id uuid not null references public.workout_exercises (id) on delete cascade,
  set_order integer not null check (set_order > 0),
  load_kg numeric check (load_kg is null or load_kg >= 0),
  reps integer check (reps is null or reps >= 0),
  created_at timestamptz not null default now()
);

create index exercise_sets_session_id_idx on public.exercise_sets (workout_session_id, workout_exercise_id, set_order);

alter table public.exercise_sets enable row level security;

create policy exercise_sets_select_own
  on public.exercise_sets for select using (auth.uid () = user_id);

create policy exercise_sets_insert_own
  on public.exercise_sets for insert with check (auth.uid () = user_id);

create policy exercise_sets_delete_own
  on public.exercise_sets for delete using (auth.uid () = user_id);
