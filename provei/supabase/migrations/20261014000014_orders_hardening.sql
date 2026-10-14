-- F2 · endurecimento depois da revisão de segurança (2026-10-14).
-- 1) place_order só pelo servidor (sem anon): o servidor aplica limite por IP; teto de pedidos abertos por mesa/levantar;
--    envios simultâneos com o mesmo client_ref devolvem o mesmo pedido.
-- 2) get_guest_order recebe o segredo em claro e faz o hash aqui (o hash guardado deixa de servir de senha).
-- 3) Pedido pago não se cancela (exige reembolso); fechos de caixa não se sobrepõem.
-- 4) Pagamento Stripe marcado de forma atómica e só se vier da conta Connect do próprio restaurante.
-- 5) Overrides de flags por restaurante legíveis sem chave de serviço (não são segredo).

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
    if (select count(*) from public.orders where table_id = v_table and status in ('new','preparing') and payment_status <> 'paid') >= 8 then
      raise exception 'too_many_open' using errcode = 'P0001';
    end if;
  else
    if p_customer_name is null or char_length(btrim(p_customer_name)) < 2 then raise exception 'name_required' using errcode = '22023'; end if;
    if not public.rate_limit_hit('order:pickup:' || p_restaurant::text, 3600, 60) then raise exception 'rate_limited' using errcode = 'P0001'; end if;
    if (select count(*) from public.orders where restaurant_id = p_restaurant and kind = 'pickup' and user_id is null
        and status in ('new','preparing') and payment_status <> 'paid') >= 30 then
      raise exception 'too_many_open' using errcode = 'P0001';
    end if;
  end if;
  if auth.uid() is not null and not public.rate_limit_hit('order:user:' || auth.uid()::text, 3600, 10) then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;

  if jsonb_typeof(p_items) <> 'array' then raise exception 'bad_items' using errcode = '22023'; end if;
  v_lines := jsonb_array_length(p_items);
  if v_lines = 0 then raise exception 'empty' using errcode = '22023'; end if;
  if v_lines > 30 then raise exception 'too_many_lines' using errcode = '22023'; end if;

  begin
    insert into public.orders (restaurant_id, user_id, table_id, kind, client_ref, guest_secret_hash, customer_name, pickup_at, note, status, total_cents)
    values (p_restaurant, auth.uid(), v_table, p_kind, p_client_ref, p_guest_secret_hash,
            nullif(btrim(coalesce(p_customer_name, '')), ''), p_pickup_at, nullif(btrim(coalesce(p_note, '')), ''), 'new', 0)
    returning id into v_id;
  exception when unique_violation then
    -- dois envios simultâneos com o mesmo client_ref: devolve o pedido que entrou primeiro
    select id into v_existing from public.orders where restaurant_id = p_restaurant and client_ref = p_client_ref;
    return v_existing;
  end;

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
revoke all on function public.place_order(uuid, text, text, jsonb, uuid, text, text, timestamptz, text) from public, anon;
grant execute on function public.place_order(uuid, text, text, jsonb, uuid, text, text, timestamptz, text) to authenticated, service_role;

create or replace function public.get_guest_order(p_id uuid, p_secret_hash text) returns jsonb
language sql stable security definer set search_path = public as $$
  -- p_secret_hash recebe o SEGREDO em claro (nome mantido por compatibilidade de assinatura)
  select jsonb_build_object(
    'id', o.id, 'status', o.status, 'kind', o.kind, 'total_cents', o.total_cents, 'created_at', o.created_at,
    'payment_status', o.payment_status, 'restaurant_id', o.restaurant_id, 'note', o.note,
    'items', coalesce((select jsonb_agg(jsonb_build_object('name', i.name, 'qty', i.qty, 'price_cents', i.price_cents, 'note', i.note))
                       from public.order_items i where i.order_id = o.id), '[]'::jsonb))
  from public.orders o
  where o.id = p_id and o.guest_secret_hash is not null and p_secret_hash is not null
    and o.guest_secret_hash = encode(sha256(convert_to(p_secret_hash, 'UTF8')), 'hex')
$$;

create or replace function public.set_order_status(p_order uuid, p_status text, p_reason text) returns text
language plpgsql security definer set search_path = public as $$
declare o record; v_role text; ok boolean;
begin
  select id, restaurant_id, status, payment_status into o from public.orders where id = p_order for update;
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
  if p_status = 'cancelled' and o.payment_status = 'paid' then raise exception 'paid_order' using errcode = 'P0001'; end if;
  update public.orders set status = p_status, updated_at = now(),
    cancel_reason = case when p_status = 'cancelled' then nullif(left(btrim(coalesce(p_reason, '')), 200), '') else cancel_reason end
  where id = p_order;
  return p_status;
end $$;

create or replace function public.close_shift(p_restaurant uuid, p_from timestamptz, p_to timestamptz, p_counted integer, p_notes text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; s record;
begin
  if not public.is_owner(p_restaurant) then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_to <= p_from or p_to - p_from > interval '36 hours' then raise exception 'bad_period' using errcode = '22023'; end if;
  if p_counted is null or p_counted < 0 then raise exception 'bad_amount' using errcode = '22023'; end if;
  if exists (select 1 from public.cash_closes c where c.restaurant_id = p_restaurant
             and tstzrange(c.period_start, c.period_end) && tstzrange(p_from, p_to)) then
    raise exception 'overlap' using errcode = 'P0001';
  end if;
  select
    count(*) filter (where status <> 'cancelled') as n,
    coalesce(sum(total_cents) filter (where status <> 'cancelled' and payment_status = 'paid' and payment_method = 'stripe'), 0) as stripe,
    coalesce(sum(total_cents) filter (where status <> 'cancelled' and payment_status = 'paid' and payment_method = 'cash'), 0) as cash,
    count(*) filter (where status <> 'cancelled' and payment_status <> 'paid') as unpaid_n,
    coalesce(sum(total_cents) filter (where status <> 'cancelled' and payment_status <> 'paid'), 0) as unpaid,
    count(*) filter (where status = 'cancelled') as canc_n,
    coalesce(sum(total_cents) filter (where status = 'cancelled'), 0) as canc
  into s from public.orders where restaurant_id = p_restaurant and created_at >= p_from and created_at < p_to and not is_synthetic;
  insert into public.cash_closes (restaurant_id, period_start, period_end, orders_count, stripe_cents, cash_expected_cents,
    cash_counted_cents, cash_diff_cents, unpaid_count, unpaid_cents, cancelled_count, cancelled_cents, notes, closed_by)
  values (p_restaurant, p_from, p_to, s.n, s.stripe, s.cash, p_counted, p_counted - s.cash, s.unpaid_n, s.unpaid, s.canc_n, s.canc,
    nullif(btrim(coalesce(p_notes, '')), ''), auth.uid())
  returning id into v_id;
  return v_id;
end $$;


create or replace function public.mark_order_paid_stripe(p_order uuid, p_account text, p_payment_intent text, p_amount integer)
returns text language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_status text;
begin
  update public.orders o set payment_status = 'paid', payment_method = 'stripe', stripe_payment_intent = p_payment_intent,
         paid_at = now(), updated_at = now()
  from public.restaurants r
  where o.id = p_order and r.id = o.restaurant_id and r.stripe_account_id is not null and r.stripe_account_id = p_account
    and o.total_cents = p_amount and o.payment_status <> 'paid' and o.status <> 'cancelled'
  returning o.id into v_id;
  if v_id is not null then return 'paid'; end if;
  select case
    when o.id is null then 'not_found'
    when o.payment_status = 'paid' then 'paid'
    when r.stripe_account_id is distinct from p_account then 'wrong_account'
    when o.status = 'cancelled' then 'cancelled'
    else 'amount_mismatch' end
  into v_status
  from (select 1) x left join public.orders o on o.id = p_order left join public.restaurants r on r.id = o.restaurant_id;
  return v_status;
end $$;
revoke all on function public.mark_order_paid_stripe(uuid, text, text, integer) from public, anon, authenticated;
grant execute on function public.mark_order_paid_stripe(uuid, text, text, integer) to service_role;

create or replace function public.restaurant_flag_overrides(p_rid uuid) returns table (key text, enabled boolean)
language sql stable security definer set search_path = public as $$
  select key, enabled from public.restaurant_flags where restaurant_id = p_rid
$$;
revoke all on function public.restaurant_flag_overrides(uuid) from public;
grant execute on function public.restaurant_flag_overrides(uuid) to anon, authenticated, service_role;
