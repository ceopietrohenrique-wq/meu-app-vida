-- Saúde > Medidas corporais e histórico de IMC. Ver docs/database.md > Fase 2.
-- Medidas são todas opcionais (o usuário pode registrar só as que quiser) e
-- vinculadas a uma data, com histórico completo — mesma filosofia de
-- weight_logs, nunca sobrescrever.

create table public.body_measurements (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid (),
  date date not null,
  waist_cm numeric check (waist_cm is null or (waist_cm > 0 and waist_cm < 300)),
  hip_cm numeric check (hip_cm is null or (hip_cm > 0 and hip_cm < 300)),
  chest_cm numeric check (chest_cm is null or (chest_cm > 0 and chest_cm < 300)),
  arm_cm numeric check (arm_cm is null or (arm_cm > 0 and arm_cm < 100)),
  thigh_cm numeric check (thigh_cm is null or (thigh_cm > 0 and thigh_cm < 150)),
  notes text,
  created_at timestamptz not null default now(),
  check (
    waist_cm is not null or hip_cm is not null or chest_cm is not null
    or arm_cm is not null or thigh_cm is not null
  )
);

create index body_measurements_user_id_date_idx on public.body_measurements (user_id, date);

alter table public.body_measurements enable row level security;

create policy body_measurements_select_own
  on public.body_measurements for select using (auth.uid () = user_id);

create policy body_measurements_insert_own
  on public.body_measurements for insert with check (auth.uid () = user_id);

create policy body_measurements_delete_own
  on public.body_measurements for delete using (auth.uid () = user_id);

-- Histórico opcional de cálculos de IMC (o usuário pode calcular sem salvar;
-- salvar é opt-in). A fórmula/validação vive em código (utils/bmi.ts,
-- testado), nunca só no banco — aqui só guardamos o resultado já validado.
create table public.bmi_records (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid (),
  weight_kg numeric not null check (weight_kg > 0 and weight_kg < 500),
  height_cm numeric not null check (height_cm > 0 and height_cm < 300),
  bmi numeric not null check (bmi > 0),
  category text not null,
  created_at timestamptz not null default now()
);

comment on table public.bmi_records is
  'Histórico opcional de cálculos de IMC. IMC não é diagnóstico médico — só um indicador geral (ver UI).';

create index bmi_records_user_id_created_at_idx on public.bmi_records (user_id, created_at);

alter table public.bmi_records enable row level security;

create policy bmi_records_select_own
  on public.bmi_records for select using (auth.uid () = user_id);

create policy bmi_records_insert_own
  on public.bmi_records for insert with check (auth.uid () = user_id);

create policy bmi_records_delete_own
  on public.bmi_records for delete using (auth.uid () = user_id);
