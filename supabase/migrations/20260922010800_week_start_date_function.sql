-- Fonte única de verdade para "início da semana", configurável por usuário
-- (profiles.week_start). Nunca hardcodar segunda-feira em nenhuma query.
-- extract(dow from date) no Postgres já usa a mesma convenção 0=domingo..
-- 6=sábado que profiles.week_start, então não há remapeamento necessário.
create function public.week_start_date(p_date date, p_week_start smallint)
returns date
language sql
immutable
as $$
  select p_date - (((extract(dow from p_date)::int - p_week_start + 7) % 7));
$$;
