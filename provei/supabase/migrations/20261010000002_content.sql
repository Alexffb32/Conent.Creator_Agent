-- Provei: conteúdo (média, pratos, seguir, guardar, notificações, menu, ofertas, analytics)
create table public.media_assets (
  id uuid primary key default gen_random_uuid(),
  owner_restaurant_id uuid references public.restaurants(id) on delete cascade,
  owner_user_id uuid references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('video','photo')),
  storage_path text not null,
  poster_path text,
  duration_ms integer check (duration_ms is null or duration_ms between 0 and 30000),
  width integer,
  height integer,
  size_bytes bigint check (size_bytes is null or size_bytes <= 104857600),
  mime text,
  status text not null default 'uploaded' check (status in ('uploaded','processing','ready','failed')),
  variants jsonb not null default '{}'::jsonb,
  external_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (owner_restaurant_id is not null or owner_user_id is not null)
);
create trigger media_updated before update on public.media_assets for each row execute function public.set_updated_at();

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  type text not null check (type in ('video','photo')),
  media_id uuid references public.media_assets(id) on delete set null,
  caption text check (char_length(caption) <= 500),
  dish_name text not null check (char_length(dish_name) between 2 and 100),
  price_cents integer check (price_cents is null or price_cents >= 0),
  tags text[] not null default '{}',
  status text not null default 'processing' check (status in ('processing','published','hidden','removed')),
  published_at timestamptz,
  view_count integer not null default 0,
  save_count integer not null default 0,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index posts_feed_idx on public.posts (published_at desc) where status = 'published' and deleted_at is null;
create index posts_restaurant_idx on public.posts (restaurant_id, published_at desc);
create trigger posts_updated before update on public.posts for each row execute function public.set_updated_at();

create table public.follows (
  user_id uuid not null references public.profiles(id) on delete cascade,
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, restaurant_id)
);
create index follows_restaurant_idx on public.follows (restaurant_id);

create table public.saves (
  user_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);
create index saves_post_idx on public.saves (post_id);

-- contadores coerentes por trigger
create or replace function public.bump_follower_count() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then update public.restaurants set follower_count = follower_count + 1 where id = new.restaurant_id;
  else update public.restaurants set follower_count = greatest(0, follower_count - 1) where id = old.restaurant_id; end if;
  return null;
end $$;
create trigger follows_count after insert or delete on public.follows for each row execute function public.bump_follower_count();

create or replace function public.bump_save_count() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then update public.posts set save_count = save_count + 1 where id = new.post_id;
  else update public.posts set save_count = greatest(0, save_count - 1) where id = old.post_id; end if;
  return null;
end $$;
create trigger saves_count after insert or delete on public.saves for each row execute function public.bump_save_count();

-- limites do plano (defesa em profundidade; o servidor também valida)
create or replace function public.enforce_post_limit() returns trigger
language plpgsql security definer set search_path = public as $$
declare lim integer; cnt integer;
begin
  select pl.max_posts_per_month into lim from public.plan_limits pl join public.restaurants r on r.plan = pl.plan where r.id = new.restaurant_id;
  select count(*) into cnt from public.posts where restaurant_id = new.restaurant_id and deleted_at is null
    and created_at >= date_trunc('month', now());
  if cnt >= lim then raise exception 'Limite de publicações do plano atingido' using errcode = 'P0001'; end if;
  return new;
end $$;
create trigger posts_limit before insert on public.posts for each row execute function public.enforce_post_limit();

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('new_post','points','redemption_ready','call_ack','call_resolved','system')),
  payload jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  keys jsonb not null,
  ua text,
  created_at timestamptz not null default now()
);

create table public.notification_prefs (
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  in_app boolean not null default true,
  push boolean not null default true,
  primary key (user_id, type)
);

-- menu
create table public.menu_categories (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  position integer not null default 0
);
create table public.menu_items (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  category_id uuid references public.menu_categories(id) on delete set null,
  name text not null check (char_length(name) between 1 and 100),
  description text check (char_length(description) <= 300),
  price_cents integer not null check (price_cents >= 0),
  available boolean not null default true,
  position integer not null default 0
);
create index menu_items_restaurant_idx on public.menu_items (restaurant_id);

-- ofertas (plano pago)
create table public.offers (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  title text not null check (char_length(title) between 2 and 80),
  description text check (char_length(description) <= 300),
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);
create or replace function public.enforce_offers_plan() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not (select pl.offers from public.plan_limits pl join public.restaurants r on r.plan = pl.plan where r.id = new.restaurant_id) then
    raise exception 'As ofertas fazem parte do plano pago' using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger offers_plan before insert on public.offers for each row execute function public.enforce_offers_plan();

-- analytics próprio
create table public.analytics_events (
  id bigint generated always as identity primary key,
  restaurant_id uuid references public.restaurants(id) on delete cascade,
  post_id uuid references public.posts(id) on delete set null,
  user_id uuid,
  type text not null check (type in ('view','watch_progress','save','follow','visit','call')),
  payload jsonb not null default '{}'::jsonb,
  ts timestamptz not null default now()
);
create index analytics_events_idx on public.analytics_events (restaurant_id, type, ts desc);

create table public.analytics_daily (
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  day date not null,
  type text not null,
  count integer not null default 0,
  primary key (restaurant_id, day, type)
);

create table public.video_watch_buckets (
  post_id uuid not null references public.posts(id) on delete cascade,
  second integer not null check (second between 0 and 29),
  views integer not null default 0,
  primary key (post_id, second)
);

create or replace function public.bump_watch_buckets(p_post uuid, p_seconds integer[]) returns void
language plpgsql security definer set search_path = public as $$
declare s integer;
begin
  foreach s in array p_seconds loop
    if s between 0 and 29 then
      insert into public.video_watch_buckets as b (post_id, second, views) values (p_post, s, 1)
      on conflict (post_id, second) do update set views = b.views + 1;
    end if;
  end loop;
end $$;
revoke all on function public.bump_watch_buckets(uuid, integer[]) from public, anon, authenticated;
grant execute on function public.bump_watch_buckets(uuid, integer[]) to service_role;

create or replace function public.bump_event(p_restaurant uuid, p_type text) returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into public.analytics_daily as d (restaurant_id, day, type, count)
  values (p_restaurant, (now() at time zone 'Europe/Lisbon')::date, p_type, 1)
  on conflict (restaurant_id, day, type) do update set count = d.count + 1;
end $$;
revoke all on function public.bump_event(uuid, text) from public, anon, authenticated;
grant execute on function public.bump_event(uuid, text) to service_role;
