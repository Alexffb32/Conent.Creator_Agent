-- ADENDA 4 · W4: Google Wallet.
-- Último saldo enviado (só se pede aviso quando o saldo muda de facto).
alter table public.wallet_passes add column if not exists pushed_points integer;

-- Pendentes por plataforma, filtrados antes do limite (anulados primeiro).
create or replace function public.wallet_pending_sync(p_platform text, p_limit integer)
returns table (id uuid, restaurant_id uuid, update_tag bigint, voided boolean)
language sql stable security definer set search_path = public as $$
  select id, restaurant_id, update_tag, voided from public.wallet_passes
  where platform = p_platform and update_tag > pushed_tag
  order by voided desc, update_tag asc
  limit least(greatest(p_limit, 1), 1000)
$$;
revoke all on function public.wallet_pending_sync(text, integer) from public, anon, authenticated;
grant execute on function public.wallet_pending_sync(text, integer) to service_role;
