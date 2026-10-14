-- Pedidos de demonstração (landing /para-restaurantes) e notificações de conteúdo ilegal (DSA art. 16, /denunciar).
-- Os clientes não leem nem escrevem diretamente: só através de funções security definer com validação e limites.

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 80),
  restaurant text not null check (char_length(restaurant) between 2 and 120),
  contact text not null check (char_length(contact) between 5 and 120),
  city text not null check (char_length(city) between 2 and 60),
  message text check (message is null or char_length(message) <= 1000),
  ip_hash text,
  status text not null default 'new' check (status in ('new','contacted','closed')),
  created_at timestamptz not null default now()
);
create index leads_created_idx on public.leads (created_at desc);

create table public.content_notices (
  id uuid primary key default gen_random_uuid(),
  reporter_name text check (reporter_name is null or char_length(reporter_name) <= 80),
  reporter_email text not null check (char_length(reporter_email) between 5 and 120 and reporter_email like '%@%'),
  content_url text not null check (char_length(content_url) between 5 and 500),
  category text not null check (category in ('illegal','ip','privacy','consumer','other')),
  explanation text not null check (char_length(explanation) between 20 and 4000),
  good_faith boolean not null check (good_faith),
  ip_hash text,
  status text not null default 'open' check (status in ('open','actioned','rejected')),
  decision text,
  decided_at timestamptz,
  created_at timestamptz not null default now()
);
create index content_notices_created_idx on public.content_notices (created_at desc);

alter table public.leads enable row level security;
alter table public.content_notices enable row level security;
create policy deny_all on public.leads for all to anon, authenticated using (false) with check (false);
create policy admin_read on public.content_notices for select to authenticated using (public.is_admin());
create policy admin_update on public.content_notices for update to authenticated using (public.is_admin()) with check (public.is_admin());

create or replace function public.submit_lead(p_name text, p_restaurant text, p_contact text, p_city text, p_message text, p_ip_hash text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not public.rate_limit_hit('lead:' || coalesce(p_ip_hash, 'x'), 3600, 5) then raise exception 'rate_limited' using errcode = 'P0001'; end if;
  if not public.rate_limit_hit('lead:global', 86400, 300) then raise exception 'rate_limited' using errcode = 'P0001'; end if;
  insert into public.leads (name, restaurant, contact, city, message, ip_hash)
  values (btrim(p_name), btrim(p_restaurant), btrim(p_contact), btrim(p_city), nullif(btrim(coalesce(p_message, '')), ''), p_ip_hash)
  returning id into v_id;
  return v_id;
end $$;

create or replace function public.submit_content_notice(p_name text, p_email text, p_url text, p_category text, p_explanation text, p_good_faith boolean, p_ip_hash text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not public.rate_limit_hit('notice:' || coalesce(p_ip_hash, 'x'), 3600, 10) then raise exception 'rate_limited' using errcode = 'P0001'; end if;
  if not public.rate_limit_hit('notice:global', 86400, 500) then raise exception 'rate_limited' using errcode = 'P0001'; end if;
  insert into public.content_notices (reporter_name, reporter_email, content_url, category, explanation, good_faith, ip_hash)
  values (nullif(btrim(coalesce(p_name, '')), ''), lower(btrim(p_email)), btrim(p_url), p_category, btrim(p_explanation), p_good_faith, p_ip_hash)
  returning id into v_id;
  return v_id;
end $$;

revoke all on function public.submit_lead(text, text, text, text, text, text) from public;
revoke all on function public.submit_content_notice(text, text, text, text, text, boolean, text) from public;
grant execute on function public.submit_lead(text, text, text, text, text, text) to anon, authenticated;
grant execute on function public.submit_content_notice(text, text, text, text, text, boolean, text) to anon, authenticated;
