-- ADENDA 4 · W1/W2: correções da revisão de segurança (2026-10-14).

-- Token do QR anterior só vale uma janela curta depois de rodar (o telemóvel busca o cartão novo entretanto).
alter table public.wallet_passes add column if not exists prev_valid_until timestamptz;

-- Envios pendentes filtrados na base de dados ANTES do limite (com muitos cartões, os já enviados não tapam os pendentes).
create or replace function public.wallet_pending_pushes(p_limit integer) returns table (id uuid, restaurant_id uuid, update_tag bigint, voided boolean)
language sql stable security definer set search_path = public as $$
  select id, restaurant_id, update_tag, voided from public.wallet_passes
  where platform = 'apple' and update_tag > pushed_tag
  order by voided desc, update_tag asc
  limit least(greatest(p_limit, 1), 1000)
$$;
revoke all on function public.wallet_pending_pushes(integer) from public, anon, authenticated;
grant execute on function public.wallet_pending_pushes(integer) to service_role;

-- O cliente vê os seus cartões, mas não os hashes dos tokens (não são exploráveis, mas não precisa deles).
revoke select on public.wallet_passes from anon, authenticated;
grant select (id, platform, restaurant_id, customer_id, card_id, serial_number, voided, show_first_name, created_at, updated_at)
  on public.wallet_passes to authenticated;
