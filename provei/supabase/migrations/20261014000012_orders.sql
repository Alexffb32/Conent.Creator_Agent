-- ADENDA 2 · F2: pedidos na mesa e para levantar, KDS, pagamentos (Stripe Connect em teste), fecho de caixa.
-- Escritas só por funções security definer: preços vêm do menu, idempotência por client_ref, limites de ritmo.

-- ---------- flags com override por restaurante ----------
create or replace function public.flag_on(p_key text, p_rid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select enabled from public.restaurant_flags where restaurant_id = p_rid and key = p_key),
    (select enabled from public.feature_flags where key = p_key),
    false)
$$;

-- ---------- menu: posto de preparação, alergénios ----------
alter table public.menu_items add column if not exists station text not null default 'cozinha'
  check (char_length(station) between 1 and 30);
alter table public.menu_items add column if not exists allergens text[] not null default '{}';

-- ---------- restaurante: Stripe Connect e modo fiscal ----------
alter table public.restaurants add column if not exists stripe_account_id text;
alter table public.restaurants add column if not exists stripe_charges_enabled boolean not null default false;
alter table public.restaurants add column if not exists fiscal_mode text not null default 'external' check (fiscal_mode in ('external'));

-- ---------- pedidos ----------
alter table public.orders alter column user_id drop not null;
alter table public.orders alter column table_session_id drop not null;
alter table public.orders drop constraint if exists orders_status_check;
update public.orders set status = 'preparing' where status = 'accepted';
update public.orders set status = 'delivered' where status = 'served';
alter table public.orders add constraint orders_status_check check (status in ('new','preparing','ready','delivered','cancelled'));
alter table public.orders add column if not exists table_id uuid references public.tables(id) on delete set null;
alter table public.orders add column if not exists kind text not null default 'table' check (kind in ('table','pickup'));
alter table public.orders add column if not exists client_ref uuid not null default gen_random_uuid();
alter table public.orders add column if not exists guest_secret_hash text;
alter table public.orders add column if not exists customer_name text check (customer_name is null or char_length(customer_name) <= 60);
alter table public.orders add column if not exists pickup_at timestamptz;
alter table public.orders add column if not exists note text check (note is null or char_length(note) <= 300);
alter table public.orders add column if not exists payment_status text not null default 'unpaid'
  check (payment_status in ('unpaid','pending','paid','refunded','failed'));
alter table public.orders add column if not exists payment_method text not null default 'none' check (payment_method in ('none','stripe','cash'));
alter table public.orders add column if not exists paid_at timestamptz;
alter table public.orders add column if not exists cancel_reason text check (cancel_reason is null or char_length(cancel_reason) <= 200);
alter table public.orders add column if not exists is_synthetic boolean not null default false;
create unique index if not exists orders_client_ref on public.orders (restaurant_id, client_ref);
create index if not exists orders_restaurant_created on public.orders (restaurant_id, created_at desc);
create index if not exists orders_restaurant_status on public.orders (restaurant_id, status);

alter table public.order_items add column if not exists station text not null default 'cozinha';
alter table public.order_items add column if not exists note text check (note is null or char_length(note) <= 140);

revoke insert, update, delete on public.orders, public.order_items from anon, authenticated;

-- Cria o pedido. p_items = [{"id": uuid, "qty": int, "note": text?}]. Devolve o id (o mesmo se client_ref repetir).
create or replace function public.place_order(
  p_restaurant uuid, p_kind text, p_table_code text, p_items jsonb, p_client_ref uuid,
  p_note text, p_customer_name text, p_pickup_at timestamptz, p_guest_secret_hash text
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_existing uuid; v_table uuid; v_id uuid; v_total integer := 0; v_lines integer; it jsonb; m record; v_qty integer;
begin
  if p_kind not in ('table','pickup') then raise exception 'bad_kind' using errcode = '22023'; end if;
  if not public.flag_on('ordering', p_restaurant) then raise exception 'ordering_off' using errcode = 'P0001'; end if;
  if not public.restaurant_is_public(p_restaurant) then raise exception 'restaurant_unavailable' using errcode = 'P0001'; end if;
  if p_client_ref is null then raise exception 'client_ref_required' using errcode = '22023'; end if;

  select id into v_existing from public.orders where restaurant_id = p_restaurant and client_ref = p_client_ref;
  if v_existing is not null then return v_existing; end if;

  if p_kind = 'table' then
    select id into v_table from public.tables where public_code = lower(p_table_code) and restaurant_id = p_restaurant and active;
    if v_table is null then raise exception 'table_not_found' using errcode = 'P0001'; end if;
    if not public.rate_limit_hit('order:table:' || v_table::text, 3600, 20) then raise exception 'rate_limited' using errcode = 'P0001'; end if;
  else
    if p_customer_name is null or char_length(btrim(p_customer_name)) < 2 then raise exception 'name_required' using errcode = '22023'; end if;
    if not public.rate_limit_hit('order:pickup:' || p_restaurant::text, 3600, 60) then raise exception 'rate_limited' using errcode = 'P0001'; end if;
  end if;
  if auth.uid() is not null and not public.rate_limit_hit('order:user:' || auth.uid()::text, 3600, 10) then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;

  if jsonb_typeof(p_items) <> 'array' then raise exception 'bad_items' using errcode = '22023'; end if;
  v_lines := jsonb_array_length(p_items);
  if v_lines = 0 then raise exception 'empty' using errcode = '22023'; end if;
  if v_lines > 30 then raise exception 'too_many_lines' using errcode = '22023'; end if;

  insert into public.orders (restaurant_id, user_id, table_id, kind, client_ref, guest_secret_hash, customer_name, pickup_at, note, status, total_cents)
  values (p_restaurant, auth.uid(), v_table, p_kind, p_client_ref, p_guest_secret_hash,
          nullif(btrim(coalesce(p_customer_name, '')), ''), p_pickup_at, nullif(btrim(coalesce(p_note, '')), ''), 'new', 0)
  returning id into v_id;

  for it in select * from jsonb_array_elements(p_items) loop
    v_qty := (it ->> 'qty')::integer;
    if v_qty is null or v_qty < 1 or v_qty > 20 then raise exception 'bad_qty' using errcode = '22023'; end if;
    select id, name, price_cents, available, station into m from public.menu_items
      where id = (it ->> 'id')::uuid and restaurant_id = p_restaurant;
    if m.id is null then raise exception 'unknown_item' using errcode = 'P0001'; end if;
    if not m.available then raise exception 'unavailable' using errcode = 'P0001'; end if;
    insert into public.order_items (order_id, menu_item_id, name, price_cents, qty, station, note)
    values (v_id, m.id, m.name, m.price_cents, v_qty, m.station, nullif(left(btrim(coalesce(it ->> 'note', '')), 140), ''));
    v_total := v_total + m.price_cents * v_qty;
  end loop;

  update public.orders set total_cents = v_total where id = v_id;
  return v_id;
end $$;
revoke all on function public.place_order(uuid, text, text, jsonb, uuid, text, text, timestamptz, text) from public;
grant execute on function public.place_order(uuid, text, text, jsonb, uuid, text, text, timestamptz, text) to anon, authenticated;

-- Leitura do pedido por quem o fez sem conta (segredo guardado só como hash).
create or replace function public.get_guest_order(p_id uuid, p_secret_hash text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id', o.id, 'status', o.status, 'kind', o.kind, 'total_cents', o.total_cents, 'created_at', o.created_at,
    'payment_status', o.payment_status, 'restaurant_id', o.restaurant_id, 'note', o.note,
    'items', coalesce((select jsonb_agg(jsonb_build_object('name', i.name, 'qty', i.qty, 'price_cents', i.price_cents, 'note', i.note))
                       from public.order_items i where i.order_id = o.id), '[]'::jsonb))
  from public.orders o
  where o.id = p_id and o.guest_secret_hash is not null and o.guest_secret_hash = p_secret_hash
$$;
revoke all on function public.get_guest_order(uuid, text) from public;
grant execute on function public.get_guest_order(uuid, text) to anon, authenticated;

-- Mudança de estado pela equipa, com as mesmas regras de packages/domain/src/orders.ts.
create or replace function public.set_order_status(p_order uuid, p_status text, p_reason text) returns text
language plpgsql security definer set search_path = public as $$
declare o record; v_role text; ok boolean;
begin
  select id, restaurant_id, status into o from public.orders where id = p_order for update;
  if o.id is null then raise exception 'not_found' using errcode = 'P0001'; end if;
  select role into v_role from public.restaurant_members where restaurant_id = o.restaurant_id and user_id = auth.uid();
  if v_role is null then raise exception 'forbidden' using errcode = '42501'; end if;
  ok := case
    when o.status = 'new' and p_status = 'preparing' then v_role in ('owner','manager','kitchen')
    when o.status = 'preparing' and p_status = 'ready' then v_role in ('owner','manager','kitchen')
    when o.status = 'ready' and p_status = 'preparing' then v_role in ('owner','manager','kitchen')
    when o.status = 'ready' and p_status = 'delivered' then v_role in ('owner','manager','waiter')
    when o.status in ('new','preparing') and p_status = 'cancelled' then v_role in ('owner','manager','waiter')
    else false end;
  if not ok then raise exception 'bad_transition' using errcode = 'P0001'; end if;
  update public.orders set status = p_status, updated_at = now(),
    cancel_reason = case when p_status = 'cancelled' then nullif(left(btrim(coalesce(p_reason, '')), 200), '') else cancel_reason end
  where id = p_order;
  return p_status;
end $$;
revoke all on function public.set_order_status(uuid, text, text) from public, anon;
grant execute on function public.set_order_status(uuid, text, text) to authenticated;

-- Pagamento em dinheiro registado pela sala/gestão.
create or replace function public.mark_order_paid_cash(p_order uuid) returns void
language plpgsql security definer set search_path = public as $$
declare o record;
begin
  select id, restaurant_id, status, payment_status into o from public.orders where id = p_order for update;
  if o.id is null then raise exception 'not_found' using errcode = 'P0001'; end if;
  if not public.has_member_role(o.restaurant_id, array['owner','manager','waiter']) then raise exception 'forbidden' using errcode = '42501'; end if;
  if o.status = 'cancelled' or o.payment_status = 'paid' then raise exception 'not_payable' using errcode = 'P0001'; end if;
  update public.orders set payment_status = 'paid', payment_method = 'cash', paid_at = now(), updated_at = now() where id = p_order;
end $$;
revoke all on function public.mark_order_paid_cash(uuid) from public, anon;
grant execute on function public.mark_order_paid_cash(uuid) to authenticated;

-- ---------- fecho de caixa (não fiscal) ----------
create table public.cash_closes (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  period_start timestamptz not null,
  period_end timestamptz not null,
  orders_count integer not null,
  stripe_cents integer not null,
  cash_expected_cents integer not null,
  cash_counted_cents integer not null check (cash_counted_cents >= 0),
  cash_diff_cents integer not null,
  unpaid_count integer not null,
  unpaid_cents integer not null,
  cancelled_count integer not null,
  cancelled_cents integer not null,
  notes text check (notes is null or char_length(notes) <= 500),
  closed_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  check (period_end > period_start)
);
create index cash_closes_restaurant on public.cash_closes (restaurant_id, period_end desc);
alter table public.cash_closes enable row level security;
create policy cash_closes_select on public.cash_closes for select to authenticated using (public.is_owner(restaurant_id));

create or replace function public.close_shift(p_restaurant uuid, p_from timestamptz, p_to timestamptz, p_counted integer, p_notes text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; s record;
begin
  if not public.is_owner(p_restaurant) then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_to <= p_from or p_to - p_from > interval '36 hours' then raise exception 'bad_period' using errcode = '22023'; end if;
  if p_counted is null or p_counted < 0 then raise exception 'bad_amount' using errcode = '22023'; end if;
  select
    count(*) filter (where status <> 'cancelled') as n,
    coalesce(sum(total_cents) filter (where status <> 'cancelled' and payment_status = 'paid' and payment_method = 'stripe'), 0) as stripe,
    coalesce(sum(total_cents) filter (where status <> 'cancelled' and payment_status = 'paid' and payment_method = 'cash'), 0) as cash,
    count(*) filter (where status <> 'cancelled' and payment_status <> 'paid') as unpaid_n,
    coalesce(sum(total_cents) filter (where status <> 'cancelled' and payment_status <> 'paid'), 0) as unpaid,
    count(*) filter (where status = 'cancelled') as canc_n,
    coalesce(sum(total_cents) filter (where status = 'cancelled'), 0) as canc
  into s from public.orders where restaurant_id = p_restaurant and created_at >= p_from and created_at < p_to;
  insert into public.cash_closes (restaurant_id, period_start, period_end, orders_count, stripe_cents, cash_expected_cents,
    cash_counted_cents, cash_diff_cents, unpaid_count, unpaid_cents, cancelled_count, cancelled_cents, notes, closed_by)
  values (p_restaurant, p_from, p_to, s.n, s.stripe, s.cash, p_counted, p_counted - s.cash, s.unpaid_n, s.unpaid, s.canc_n, s.canc,
    nullif(btrim(coalesce(p_notes, '')), ''), auth.uid())
  returning id into v_id;
  return v_id;
end $$;
revoke all on function public.close_shift(uuid, timestamptz, timestamptz, integer, text) from public, anon;
grant execute on function public.close_shift(uuid, timestamptz, timestamptz, integer, text) to authenticated;

-- ---------- tempo real para o KDS ----------
do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.orders;
  end if;
end $$;

-- ---------- leitura pública mínima para a página de pedido ----------
grant execute on function public.flag_on(text, uuid) to anon, authenticated;

-- O QR da mesa só revela restaurante (público) e etiqueta da mesa; nada sobre sessões ou clientes.
create or replace function public.table_public_info(p_code text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('restaurant_id', r.id, 'slug', r.slug, 'name', r.name, 'table_label', t.label,
                            'ordering', public.flag_on('ordering', r.id), 'payments', public.flag_on('payments', r.id),
                            'stripe_ready', r.stripe_charges_enabled)
  from public.tables t join public.restaurants r on r.id = t.restaurant_id
  where t.public_code = lower(p_code) and t.active and r.verified_status = 'verified' and r.deleted_at is null
$$;
revoke all on function public.table_public_info(text) from public;
grant execute on function public.table_public_info(text) to anon, authenticated;
