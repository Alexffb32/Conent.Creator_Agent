-- F2: dados sintéticos (testes/demonstração) nunca entram no fecho de caixa nem em números.
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
  into s from public.orders where restaurant_id = p_restaurant and created_at >= p_from and created_at < p_to and not is_synthetic;
  insert into public.cash_closes (restaurant_id, period_start, period_end, orders_count, stripe_cents, cash_expected_cents,
    cash_counted_cents, cash_diff_cents, unpaid_count, unpaid_cents, cancelled_count, cancelled_cents, notes, closed_by)
  values (p_restaurant, p_from, p_to, s.n, s.stripe, s.cash, p_counted, p_counted - s.cash, s.unpaid_n, s.unpaid, s.canc_n, s.canc,
    nullif(btrim(coalesce(p_notes, '')), ''), auth.uid())
  returning id into v_id;
  return v_id;
end $$;
