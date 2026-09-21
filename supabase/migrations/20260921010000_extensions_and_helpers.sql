-- Extensões e funções auxiliares usadas por todas as migrations seguintes.

create extension if not exists pgcrypto;

-- Mantém `updated_at` sincronizado em qualquer UPDATE, para todas as tabelas
-- que possuem essa coluna. Reutilizada pelas migrations de cada domínio.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
