-- ADENDA 2 · F1: quatro tipos de conta (cliente, restaurante, anunciante, admin), papéis no restaurante,
-- MFA obrigatório para admin, novas flags, eventos do feed e consentimentos alargados.
-- Um mesmo e-mail pode ter vários papéis: os papéis derivam das tabelas de pertença (ver public.user_roles).

-- ---------- papéis no restaurante: owner | manager | kitchen | waiter ----------
alter table public.restaurant_members drop constraint if exists restaurant_members_role_check;
update public.restaurant_members set role = 'waiter' where role = 'staff';
alter table public.restaurant_members add constraint restaurant_members_role_check
  check (role in ('owner','manager','kitchen','waiter'));

alter table public.restaurant_invites add column if not exists member_role text not null default 'waiter'
  check (member_role in ('manager','kitchen','waiter'));

-- Gestão (menu, preços, números, IA, cupões, equipa): owner ou manager.
-- O nome is_owner mantém-se para não reescrever 40 políticas; o significado passa a "pode gerir".
create or replace function public.is_owner(rid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.restaurant_members where restaurant_id = rid and user_id = auth.uid() and role in ('owner','manager'))
$$;
-- Dono em sentido estrito (faturação/plano, remover gerentes).
create or replace function public.is_restaurant_owner(rid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.restaurant_members where restaurant_id = rid and user_id = auth.uid() and role = 'owner')
$$;
-- Sala: owner, manager, waiter (chamadas, mesas, visitas, cartões). A cozinha fica de fora.
create or replace function public.is_member(rid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.restaurant_members where restaurant_id = rid and user_id = auth.uid() and role in ('owner','manager','waiter'))
$$;
-- Toda a equipa, cozinha incluída (restaurante, menu, pedidos, flags).
create or replace function public.is_crew(rid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.restaurant_members where restaurant_id = rid and user_id = auth.uid())
$$;
create or replace function public.has_member_role(rid uuid, roles text[]) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.restaurant_members where restaurant_id = rid and user_id = auth.uid() and role = any(roles))
$$;

alter policy restaurants_select on public.restaurants
  using ((verified_status = 'verified' and deleted_at is null) or public.is_crew(id) or public.is_admin());
alter policy members_select on public.restaurant_members
  using (user_id = auth.uid() or public.is_crew(restaurant_id) or public.is_admin());
alter policy members_delete_staff on public.restaurant_members rename to members_delete_team;
alter policy members_delete_team on public.restaurant_members
  using ((public.is_restaurant_owner(restaurant_id) and role <> 'owner')
         or (public.is_owner(restaurant_id) and role in ('kitchen','waiter')));
alter policy rflags_select on public.restaurant_flags using (public.is_crew(restaurant_id) or public.is_admin());
alter policy menu_cat_select on public.menu_categories
  using (public.restaurant_is_public(restaurant_id) or public.is_crew(restaurant_id));
alter policy menu_item_select on public.menu_items
  using (public.restaurant_is_public(restaurant_id) or public.is_crew(restaurant_id));
alter policy orders_select on public.orders using (user_id = auth.uid() or public.is_crew(restaurant_id));
alter policy order_items_select on public.order_items
  using (exists (select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.is_crew(o.restaurant_id))));
alter policy subs_select on public.subscriptions using (public.is_restaurant_owner(restaurant_id) or public.is_admin());
alter policy fees_select on public.install_fees using (public.is_restaurant_owner(restaurant_id) or public.is_admin());

-- ---------- admin: MFA (aal2) obrigatório ----------
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin and suspended_at is null and deleted_at is null from public.profiles where id = auth.uid()), false)
     and coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
$$;

-- ---------- anunciantes ----------
create table public.advertisers (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  contact_email text not null check (char_length(contact_email) between 5 and 120),
  vat_id text check (vat_id is null or char_length(vat_id) <= 32),
  status text not null default 'active' check (status in ('active','suspended')),
  is_synthetic boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create table public.advertiser_members (
  advertiser_id uuid not null references public.advertisers(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','member')),
  created_at timestamptz not null default now(),
  primary key (advertiser_id, user_id)
);
create or replace function public.is_advertiser_member(aid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.advertiser_members where advertiser_id = aid and user_id = auth.uid())
$$;
alter table public.advertisers enable row level security;
alter table public.advertiser_members enable row level security;
create policy advertisers_select on public.advertisers for select to authenticated
  using (public.is_advertiser_member(id) or public.is_admin());
create policy advertisers_admin on public.advertisers for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy adv_members_select on public.advertiser_members for select to authenticated
  using (user_id = auth.uid() or public.is_advertiser_member(advertiser_id) or public.is_admin());

-- Cria a conta de anunciante e torna quem a cria dono (escritas só por esta função).
create or replace function public.create_advertiser(p_name text, p_email text, p_vat text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if auth.uid() is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  if not public.rate_limit_hit('advertiser:' || auth.uid()::text, 86400, 3) then raise exception 'rate_limited' using errcode = 'P0001'; end if;
  insert into public.advertisers (name, contact_email, vat_id, created_by)
  values (btrim(p_name), lower(btrim(p_email)), nullif(btrim(coalesce(p_vat, '')), ''), auth.uid()) returning id into v_id;
  insert into public.advertiser_members (advertiser_id, user_id, role) values (v_id, auth.uid(), 'owner');
  return v_id;
end $$;
revoke all on function public.create_advertiser(text, text, text) from public, anon;
grant execute on function public.create_advertiser(text, text, text) to authenticated;

-- ---------- papéis do utilizador (para o JWT e para a interface) ----------
create or replace function public.user_roles(uid uuid) returns text[]
language sql stable security definer set search_path = public as $$
  select array_remove(array[
    'customer',
    case when exists (select 1 from public.restaurant_members m where m.user_id = uid) then 'restaurant' end,
    case when exists (select 1 from public.advertiser_members a where a.user_id = uid) then 'advertiser' end,
    case when exists (select 1 from public.profiles p where p.id = uid and p.is_admin) then 'admin' end
  ], null)
$$;
revoke all on function public.user_roles(uuid) from public, anon, authenticated;

-- Hook "Custom Access Token" do Supabase Auth: põe app_roles no JWT. Ativa-se no painel (Auth > Hooks).
-- As políticas RLS NÃO dependem destas claims (leem as tabelas); as claims servem a interface.
create or replace function public.custom_access_token_hook(event jsonb) returns jsonb
language plpgsql stable set search_path = public as $$
declare claims jsonb := coalesce(event -> 'claims', '{}'::jsonb);
begin
  claims := jsonb_set(claims, '{app_roles}', to_jsonb(public.user_roles((event ->> 'user_id')::uuid)));
  return jsonb_set(event, '{claims}', claims);
end $$;
grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;
grant execute on function public.user_roles(uuid) to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook(jsonb) from public, anon, authenticated;

-- ---------- perfil: idioma ----------
alter table public.profiles add column if not exists locale text not null default 'pt' check (locale in ('pt','en'));

-- ---------- flags da ADENDA 2 (todas desligadas) ----------
insert into public.feature_flags (key, enabled, description) values
  ('ordering', false, 'Pedidos na mesa e para levantar'),
  ('kds', false, 'Ecrã de cozinha (KDS)'),
  ('whatsapp', false, 'Mensagens WhatsApp (utility, com opt-in)'),
  ('review_requests', false, 'Pedido de avaliação depois do pedido, com ligação ao Google para todos'),
  ('coupons', false, 'Cupões e reativação de clientes'),
  ('analytics', false, 'Números, vendas e food cost'),
  ('ai_advisor', false, 'Assistente de IA para o restaurante'),
  ('recommender', false, 'Sugestões à mesa e feed personalizado'),
  ('kitchen_forecast', false, 'Previsão de preparação para a cozinha')
on conflict (key) do nothing;
update public.feature_flags set enabled = false where key = 'table_ordering';

-- ---------- eventos do feed (base da personalização; só com conta) ----------
create table public.feed_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  impression_id uuid not null,
  post_id uuid references public.posts(id) on delete cascade,
  restaurant_id uuid references public.restaurants(id) on delete cascade,
  event text not null check (event in ('impression','view','like','save','share','open_restaurant','order','skip','hide')),
  value real check (value is null or (value >= 0 and value <= 1)),
  ts timestamptz not null default now()
);
create index feed_events_user_ts on public.feed_events (user_id, ts desc);
create index feed_events_post on public.feed_events (post_id, event);
alter table public.feed_events enable row level security;
create policy feed_events_select_own on public.feed_events for select to authenticated using (user_id = auth.uid());
create policy feed_events_insert_own on public.feed_events for insert to authenticated with check (user_id = auth.uid());
create policy feed_events_delete_own on public.feed_events for delete to authenticated using (user_id = auth.uid());

-- ---------- consentimentos alargados ----------
alter table public.consents drop constraint if exists consents_kind_check;
alter table public.consents add constraint consents_kind_check check (kind in
  ('terms','privacy','location','push','ads_personalization','personalization','whatsapp_utility','whatsapp_marketing','email_marketing'));
