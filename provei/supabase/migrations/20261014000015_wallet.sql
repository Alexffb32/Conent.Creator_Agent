-- ADENDA 4 · W1: cartão de fidelidade na Apple Wallet / Google Wallet.
-- Um cartão por restaurante por cliente. Tokens (authenticationToken e token do QR) derivados por HMAC no servidor
-- a partir do número de série; na base de dados só ficam os hashes.

insert into public.feature_flags (key, enabled, description) values
  ('wallet_apple', false, 'Cartão de fidelidade na Apple Wallet'),
  ('wallet_google', false, 'Cartão de fidelidade na Google Wallet'),
  ('wallet_updates', false, 'Atualização dos cartões na Wallet (serviço web PassKit e push)'),
  ('wallet_location', false, 'Aviso por proximidade no ecrã de bloqueio (localizações no cartão)'),
  ('wallet_campaigns', false, 'Ofertas pela Wallet (marketing, com consentimento próprio)')
on conflict (key) do nothing;

create table public.wallet_passes (
  id uuid primary key default gen_random_uuid(),
  platform text not null check (platform in ('apple','google')),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  customer_id uuid references public.profiles(id) on delete set null,
  card_id uuid references public.loyalty_cards(id) on delete set null,
  serial_number text not null unique check (serial_number ~ '^[a-f0-9]{32}$'),
  auth_token_hash text not null,
  member_version integer not null default 1 check (member_version >= 1),
  member_token_hash text not null unique,
  prev_member_token_hash text,
  update_tag bigint not null default 1,
  location_control boolean not null default false,
  show_first_name boolean not null default false,
  offer text check (offer is null or char_length(offer) <= 60),
  voided boolean not null default false,
  is_synthetic boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index wallet_passes_one_active on public.wallet_passes (platform, restaurant_id, customer_id)
  where customer_id is not null and not voided;
create index wallet_passes_customer on public.wallet_passes (customer_id);
create index wallet_passes_prev_member on public.wallet_passes (prev_member_token_hash) where prev_member_token_hash is not null;

-- Registos de dispositivos (serviço web PassKit, W2). Só o servidor lê e escreve.
create table public.wallet_registrations (
  device_library_id text not null check (char_length(device_library_id) between 1 and 128),
  pass_id uuid not null references public.wallet_passes(id) on delete cascade,
  push_token text not null check (char_length(push_token) between 1 and 256),
  updated_at timestamptz not null default now(),
  primary key (device_library_id, pass_id)
);
create index wallet_registrations_pass on public.wallet_registrations (pass_id);

alter table public.wallet_passes enable row level security;
alter table public.wallet_registrations enable row level security;
-- O cliente vê os seus cartões; escritas só pelo servidor (service_role). Registos: sem acesso de clientes.
create policy wallet_passes_select_own on public.wallet_passes for select to authenticated using (customer_id = auth.uid());
revoke insert, update, delete on public.wallet_passes from anon, authenticated;
revoke all on public.wallet_registrations from anon, authenticated;

-- Conta apagada: cartões anulados (voided) e etiqueta avançada para o dispositivo buscar a versão anulada.
-- Os registos dos dispositivos são removidos depois do push de atualização (W2) ou pela limpeza diária.
create or replace function public.void_wallet_passes_on_delete() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.deleted_at is not null and old.deleted_at is null then
    update public.wallet_passes set voided = true, update_tag = update_tag + 1, updated_at = now()
    where customer_id = new.id and not voided;
  end if;
  return new;
end $$;
create trigger profiles_void_wallet after update of deleted_at on public.profiles
  for each row execute function public.void_wallet_passes_on_delete();

-- Pontos, carimbos ou nível mudaram: avança a etiqueta dos cartões Wallet desse cartão de fidelização
-- (o serviço web devolve-os em passesUpdatedSince e o push de atualização é enviado pelo servidor, W2).
create or replace function public.bump_wallet_on_card_change() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.points is distinct from old.points or new.stamps is distinct from old.stamps or new.level is distinct from old.level then
    update public.wallet_passes set update_tag = update_tag + 1, updated_at = now() where card_id = new.id and not voided;
  end if;
  return new;
end $$;
create trigger loyalty_cards_bump_wallet after update on public.loyalty_cards
  for each row execute function public.bump_wallet_on_card_change();
