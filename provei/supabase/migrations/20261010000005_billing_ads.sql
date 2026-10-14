-- Provei: planos, cobrança, anúncios, pedidos
create table public.plans (
  key text primary key check (key in ('free','paid')),
  name text not null,
  description text
);
insert into public.plans values
  ('free', 'Gratuito', 'Perfil, feed, até 3 mesas e cartão de carimbos simples'),
  ('paid', 'Pago', 'Sem limite prático, pontos, níveis, ofertas, Wallet e métricas completas');

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  plan text not null check (plan in ('free','paid')),
  status text not null default 'active' check (status in ('active','trialing','past_due','canceled','manual')),
  stripe_customer_id text,
  stripe_subscription_id text unique,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index subscriptions_restaurant_idx on public.subscriptions (restaurant_id);

create table public.install_fees (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  amount_cents integer not null check (amount_cents >= 0),
  status text not null default 'pending' check (status in ('pending','paid','waived','manual')),
  stripe_payment_intent text,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.user_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null default 'ad_free' check (kind = 'ad_free'),
  status text not null default 'active',
  stripe_customer_id text,
  stripe_subscription_id text unique,
  current_period_end timestamptz,
  created_at timestamptz not null default now()
);

-- webhooks idempotentes
create table public.stripe_events (
  id text primary key,
  type text not null,
  processed_at timestamptz not null default now()
);

create table public.ad_campaigns (
  id uuid primary key default gen_random_uuid(),
  advertiser_name text not null,
  restaurant_id uuid references public.restaurants(id) on delete set null,
  creative jsonb not null default '{}'::jsonb,
  targeting jsonb not null default '{}'::jsonb,
  budget_cents integer not null check (budget_cents >= 0),
  spent_cents integer not null default 0,
  status text not null default 'draft' check (status in ('draft','active','paused','ended')),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);
create table public.ad_impressions (
  id bigint generated always as identity primary key,
  campaign_id uuid not null references public.ad_campaigns(id) on delete cascade,
  user_id uuid,
  ts timestamptz not null default now()
);
create index ad_impressions_idx on public.ad_impressions (campaign_id, user_id, ts desc);
create table public.ad_clicks (
  id bigint generated always as identity primary key,
  campaign_id uuid not null references public.ad_campaigns(id) on delete cascade,
  user_id uuid,
  ts timestamptz not null default now()
);

-- pedidos na mesa (flag table_ordering, desligada por omissão)
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  table_session_id uuid not null references public.table_sessions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'new' check (status in ('new','accepted','ready','served','cancelled')),
  total_cents integer not null default 0,
  stripe_payment_intent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  menu_item_id uuid references public.menu_items(id) on delete set null,
  name text not null,
  price_cents integer not null check (price_cents >= 0),
  qty integer not null check (qty between 1 and 20)
);
