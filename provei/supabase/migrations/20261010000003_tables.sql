-- Provei: mesas, sessões de mesa, chamadas de empregado
create table public.tables (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  label text not null check (char_length(label) between 1 and 30),
  nfc_uid text,
  public_code text not null unique check (public_code ~ '^[a-z0-9]{6,16}$'),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (restaurant_id, label)
);
create index tables_restaurant_idx on public.tables (restaurant_id);

create or replace function public.enforce_table_limit() returns trigger
language plpgsql security definer set search_path = public as $$
declare lim integer; cnt integer;
begin
  select pl.max_tables into lim from public.plan_limits pl join public.restaurants r on r.plan = pl.plan where r.id = new.restaurant_id;
  select count(*) into cnt from public.tables where restaurant_id = new.restaurant_id;
  if cnt >= lim then raise exception 'Limite de mesas do plano atingido' using errcode = 'P0001'; end if;
  return new;
end $$;
create trigger tables_limit before insert on public.tables for each row execute function public.enforce_table_limit();

create table public.table_sessions (
  id uuid primary key default gen_random_uuid(),
  table_id uuid not null references public.tables(id) on delete cascade,
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  started_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '3 hours'),
  ended_at timestamptz,
  source text not null check (source in ('qr','nfc')),
  token_jti text not null unique
);
create index table_sessions_active_idx on public.table_sessions (table_id) where ended_at is null;
create index table_sessions_user_idx on public.table_sessions (user_id, started_at desc);

-- tokens de uso único: o jti é registado ao ser trocado
create table public.table_token_uses (
  jti text primary key,
  table_id uuid not null,
  used_by uuid,
  used_at timestamptz not null default now()
);

create table public.waiter_calls (
  id uuid primary key default gen_random_uuid(),
  table_session_id uuid not null references public.table_sessions(id) on delete cascade,
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  table_id uuid not null references public.tables(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null default 'call' check (reason in ('call','bill','help')),
  status text not null default 'open' check (status in ('open','acknowledged','resolved','rejected','expired')),
  ip_hash text,
  created_at timestamptz not null default now(),
  acknowledged_by uuid references public.profiles(id),
  acknowledged_at timestamptz,
  resolved_at timestamptz
);
-- só uma chamada aberta por mesa de cada vez (garantido pela base de dados)
create unique index waiter_calls_one_open_per_table on public.waiter_calls (table_id) where status in ('open','acknowledged');
create index waiter_calls_queue_idx on public.waiter_calls (restaurant_id, created_at desc);
create index waiter_calls_user_idx on public.waiter_calls (user_id, created_at desc);

-- bloqueios e "ignorar utilizador" por restaurante
create table public.restaurant_user_blocks (
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('auto_block','ignored')),
  until timestamptz,
  created_by uuid,
  created_at timestamptz not null default now(),
  primary key (restaurant_id, user_id, kind)
);
