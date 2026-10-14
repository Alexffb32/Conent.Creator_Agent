-- Provei: visitas, fidelização, avaliações, feedback, denúncias
create table public.visits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  table_session_id uuid references public.table_sessions(id) on delete set null,
  level text not null check (level in ('qr','staff_validated','receipt')),
  verified_at timestamptz not null default now(),
  validated_by uuid references public.profiles(id),
  validation_reason text,
  points_awarded integer not null default 0,
  created_at timestamptz not null default now()
);
create unique index visits_one_per_session on public.visits (table_session_id) where table_session_id is not null;
create index visits_user_restaurant_idx on public.visits (user_id, restaurant_id, verified_at desc);
create index visits_restaurant_idx on public.visits (restaurant_id, verified_at desc);

create table public.loyalty_programs (
  restaurant_id uuid primary key references public.restaurants(id) on delete cascade,
  stamps_required integer not null default 8 check (stamps_required between 2 and 50),
  reward_text text not null default 'Uma sobremesa por conta da casa',
  points_per_visit integer not null default 10 check (points_per_visit >= 0),
  points_per_review_photo integer not null default 5 check (points_per_review_photo >= 0),
  points_first_visit integer not null default 20 check (points_first_visit >= 0),
  levels jsonb not null default '[]'::jsonb,
  min_interval_hours integer not null default 12 check (min_interval_hours >= 0),
  active boolean not null default true,
  updated_at timestamptz not null default now()
);

create table public.loyalty_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  stamps integer not null default 0 check (stamps >= 0),
  points integer not null default 0,
  completed_cycles integer not null default 0,
  level text not null default 'convidado',
  wallet_apple_serial text,
  wallet_google_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, restaurant_id)
);

create table public.loyalty_events (
  id bigint generated always as identity primary key,
  card_id uuid not null references public.loyalty_cards(id) on delete cascade,
  type text not null check (type in ('stamp','points','redeem','adjust')),
  delta integer not null,
  reason text,
  visit_id uuid references public.visits(id) on delete set null,
  actor_id uuid,
  created_at timestamptz not null default now()
);
create index loyalty_events_card_idx on public.loyalty_events (card_id, created_at);
-- idempotência: um carimbo e uns pontos por visita
create unique index loyalty_events_once_per_visit on public.loyalty_events (visit_id, type) where visit_id is not null and type in ('stamp','points');

-- livro-razão imutável
create or replace function public.loyalty_events_immutable() returns trigger
language plpgsql set search_path = public as $$
begin raise exception 'O livro-razão de fidelização é imutável' using errcode = 'P0001'; end $$;
create trigger loyalty_events_no_update before update or delete on public.loyalty_events
  for each row execute function public.loyalty_events_immutable();

-- saldo do cartão = soma do livro-razão (mantido por trigger)
create or replace function public.apply_loyalty_event() returns trigger
language plpgsql security definer set search_path = public as $$
declare uid uuid;
begin
  if new.type in ('stamp','redeem') or (new.type = 'adjust' and coalesce(new.reason,'') like 'stamps:%') then
    update public.loyalty_cards set stamps = stamps + new.delta, updated_at = now() where id = new.card_id;
    if new.type = 'redeem' then update public.loyalty_cards set completed_cycles = completed_cycles + 1 where id = new.card_id; end if;
  else
    update public.loyalty_cards set points = points + new.delta, updated_at = now() where id = new.card_id returning user_id into uid;
    update public.profiles set points_total = points_total + new.delta where id = uid;
  end if;
  return null;
end $$;
create trigger loyalty_events_apply after insert on public.loyalty_events for each row execute function public.apply_loyalty_event();

create or replace function public.loyalty_card_consistent(p_card uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select c.stamps = coalesce((select sum(delta) from public.loyalty_events e where e.card_id = c.id and (e.type in ('stamp','redeem') or (e.type = 'adjust' and coalesce(e.reason,'') like 'stamps:%'))), 0)
     and c.points = coalesce((select sum(delta) from public.loyalty_events e where e.card_id = c.id and not (e.type in ('stamp','redeem') or (e.type = 'adjust' and coalesce(e.reason,'') like 'stamps:%'))), 0)
  from public.loyalty_cards c where c.id = p_card
$$;
revoke all on function public.loyalty_card_consistent(uuid) from public, anon, authenticated;
grant execute on function public.loyalty_card_consistent(uuid) to service_role;

create table public.rewards (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  title text not null check (char_length(title) between 2 and 100),
  kind text not null default 'stamp_card' check (kind in ('stamp_card','points')),
  points_cost integer check (points_cost is null or points_cost > 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.redemptions (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.loyalty_cards(id) on delete cascade,
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  reward_id uuid references public.rewards(id) on delete set null,
  reward_text text not null,
  code text not null unique,
  cycle integer not null default 0,
  status text not null default 'issued' check (status in ('issued','redeemed','expired')),
  expires_at timestamptz not null default (now() + interval '30 days'),
  redeemed_at timestamptz,
  validated_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
-- sem resgate duplicado: um por ciclo de cartão de carimbos
create unique index redemptions_one_per_cycle on public.redemptions (card_id, cycle) where reward_id is null;

-- avaliações
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  visit_id uuid references public.visits(id) on delete set null,
  rating smallint not null check (rating between 1 and 5),
  text text check (char_length(text) <= 1000),
  photo_media_id uuid references public.media_assets(id) on delete set null,
  verified boolean not null default false,
  status text not null default 'published' check (status in ('published','hidden','removed','replaced')),
  flagged_count integer not null default 0,
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);
create unique index reviews_one_active on public.reviews (user_id, restaurant_id) where status = 'published';
create index reviews_restaurant_idx on public.reviews (restaurant_id, created_at desc) where status = 'published';

create table public.review_replies (
  review_id uuid primary key references public.reviews(id) on delete cascade,
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  author_id uuid not null references public.profiles(id),
  body text not null check (char_length(body) between 2 and 500),
  created_at timestamptz not null default now()
);

create table public.private_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  message text not null check (char_length(message) between 2 and 1000),
  created_at timestamptz not null default now()
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  target_type text not null check (target_type in ('review','post','restaurant','user')),
  target_id uuid not null,
  reason text not null check (char_length(reason) between 3 and 500),
  status text not null default 'open' check (status in ('open','resolved','dismissed')),
  resolved_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (reporter_id, target_type, target_id)
);

create or replace function public.bump_review_flags() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.target_type = 'review' then update public.reviews set flagged_count = flagged_count + 1 where id = new.target_id; end if;
  return null;
end $$;
create trigger reports_flag after insert on public.reports for each row execute function public.bump_review_flags();
