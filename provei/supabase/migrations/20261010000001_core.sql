-- Provei: núcleo (perfis, restaurantes, membros, flags, auditoria, consentimentos)

create or replace function public.set_updated_at() returns trigger
language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end $$;

-- ---------- perfis ----------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 80),
  handle text unique check (handle ~ '^[a-z0-9_]{3,24}$'),
  avatar_path text,
  bio text check (char_length(bio) <= 280),
  city text,
  locale text not null default 'pt-PT',
  level text not null default 'convidado',
  points_total integer not null default 0,
  consents jsonb not null default '{}'::jsonb,
  is_ad_free boolean not null default false,
  is_admin boolean not null default false,
  onboarded_at timestamptz,
  suspended_at timestamptz,
  is_demo boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_updated before update on public.profiles for each row execute function public.set_updated_at();

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin and suspended_at is null and deleted_at is null from public.profiles where id = auth.uid()), false)
$$;

-- cria perfil quando nasce um utilizador em auth.users
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare base text; candidate text;
begin
  base := regexp_replace(lower(split_part(coalesce(new.email, 'user'), '@', 1)), '[^a-z0-9_]', '', 'g');
  if char_length(base) < 3 then base := 'user' || base; end if;
  candidate := left(base, 17) || '_' || substr(md5(random()::text || new.id::text), 1, 5);
  insert into public.profiles (id, display_name, handle)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''), candidate)
  on conflict (id) do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- ---------- restaurantes ----------
create table public.restaurants (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,60}$'),
  name text not null check (char_length(name) between 2 and 100),
  description text check (char_length(description) <= 1000),
  cuisine text[] not null default '{}',
  address text,
  lat double precision check (lat between -90 and 90),
  lng double precision check (lng between -180 and 180),
  city text,
  phone text,
  website text,
  hours jsonb not null default '{}'::jsonb,
  price_level smallint check (price_level between 1 and 4),
  cover_path text,
  logo_path text,
  verified_status text not null default 'pending' check (verified_status in ('pending','verified','rejected')),
  plan text not null default 'free' check (plan in ('free','paid')),
  plan_since timestamptz,
  settings jsonb not null default '{}'::jsonb,
  follower_count integer not null default 0,
  is_demo boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index restaurants_city_idx on public.restaurants (city) where deleted_at is null;
create trigger restaurants_updated before update on public.restaurants for each row execute function public.set_updated_at();

create table public.restaurant_members (
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('owner','staff')),
  created_at timestamptz not null default now(),
  primary key (restaurant_id, user_id)
);
create index restaurant_members_user_idx on public.restaurant_members (user_id);

-- convites de equipa pendentes (por e-mail)
create table public.restaurant_invites (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  email text not null,
  role text not null default 'staff' check (role = 'staff'),
  invited_by uuid references public.profiles(id),
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  unique (restaurant_id, email)
);

create or replace function public.is_member(rid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.restaurant_members where restaurant_id = rid and user_id = auth.uid())
$$;
create or replace function public.is_owner(rid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.restaurant_members where restaurant_id = rid and user_id = auth.uid() and role = 'owner')
$$;
create or replace function public.restaurant_is_public(rid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.restaurants where id = rid and verified_status = 'verified' and deleted_at is null)
$$;

-- ---------- flags e limites de plano ----------
create table public.feature_flags (
  key text primary key,
  enabled boolean not null default false,
  description text,
  updated_at timestamptz not null default now()
);
create table public.restaurant_flags (
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  key text not null references public.feature_flags(key) on delete cascade,
  enabled boolean not null,
  primary key (restaurant_id, key)
);
insert into public.feature_flags (key, enabled, description) values
  ('payments', false, 'Cobrança com Stripe'),
  ('wallet', false, 'Cartões Apple/Google Wallet'),
  ('ads', false, 'Cartões patrocinados no feed'),
  ('ad_free_subscription', false, 'Assinatura sem anúncios'),
  ('table_ordering', false, 'Pedidos e pagamento na mesa'),
  ('video_external_processor', true, 'Processador de vídeo externo (Mux/Cloudflare)'),
  ('web_push', true, 'Notificações push web'),
  ('reviews', true, 'Avaliações'),
  ('loyalty', true, 'Fidelização'),
  ('call_waiter', true, 'Chamar empregado');

create table public.plan_limits (
  plan text primary key check (plan in ('free','paid')),
  max_tables integer not null,
  max_posts_per_month integer not null,
  offers boolean not null,
  video_retention boolean not null,
  wallet boolean not null,
  full_loyalty boolean not null
);
insert into public.plan_limits values
  ('free', 3, 8, false, false, false, false),
  ('paid', 1000000, 1000000, true, true, true, true);

-- ---------- auditoria e consentimentos ----------
create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid,
  action text not null,
  entity text,
  entity_id text,
  restaurant_id uuid,
  meta jsonb not null default '{}'::jsonb,
  ip_hash text,
  ts timestamptz not null default now()
);
create index audit_logs_ts_idx on public.audit_logs (ts desc);
create index audit_logs_restaurant_idx on public.audit_logs (restaurant_id, ts desc);

create table public.consents (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('terms','privacy','location','push','ads_personalization')),
  granted boolean not null,
  version text not null default '2026-10',
  ts timestamptz not null default now()
);
create index consents_user_idx on public.consents (user_id, kind, ts desc);

-- rate limiting em Postgres (fallback quando não há Redis)
create table public.rate_limits (
  key text not null,
  window_start timestamptz not null,
  count integer not null default 0,
  primary key (key, window_start)
);
create or replace function public.rate_limit_hit(p_key text, p_window_seconds integer, p_max integer)
returns boolean language plpgsql security definer set search_path = public as $$
declare w timestamptz; c integer;
begin
  w := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  insert into public.rate_limits as r (key, window_start, count) values (p_key, w, 1)
  on conflict (key, window_start) do update set count = r.count + 1 returning count into c;
  return c <= p_max;
end $$;
revoke all on function public.rate_limit_hit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.rate_limit_hit(text, integer, integer) to service_role;
