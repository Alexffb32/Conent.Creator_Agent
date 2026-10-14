-- ADENDA 4 · W2: serviço web PassKit, push de atualização e avisos de pontos.

-- Etiqueta GLOBAL e monotónica: o dispositivo pergunta "o que mudou desde X" para todos os seus cartões;
-- um contador por cartão perderia atualizações (cartão A em 5, cartão B em 2 → "desde 5" esquecia o B).
create sequence if not exists public.wallet_update_seq;
select setval('public.wallet_update_seq', greatest((select coalesce(max(update_tag), 1) from public.wallet_passes), 1));
alter table public.wallet_passes alter column update_tag set default nextval('public.wallet_update_seq');

-- Último update_tag para o qual já se enviou push (o envio pendente é update_tag > pushed_tag).
alter table public.wallet_passes add column if not exists pushed_tag bigint not null default 0;

-- Qualquer mudança de conteúdo do cartão recebe uma etiqueta nova da sequência (nunca fica para trás).
create or replace function public.wallet_pass_bump_tag() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.update_tag is distinct from old.update_tag
     or new.member_version is distinct from old.member_version
     or new.offer is distinct from old.offer
     or new.voided is distinct from old.voided
     or new.show_first_name is distinct from old.show_first_name then
    new.update_tag := nextval('public.wallet_update_seq');
    new.updated_at := now();
  end if;
  return new;
end $$;
create trigger wallet_passes_bump_tag before update on public.wallet_passes
  for each row execute function public.wallet_pass_bump_tag();

-- Saúde do APNs / Google (admin): só resultado e motivo, sem tokens nem dados pessoais.
create table public.wallet_push_events (
  id bigint generated always as identity primary key,
  platform text not null check (platform in ('apple','google')),
  pass_id uuid references public.wallet_passes(id) on delete set null,
  status text not null check (status in ('sent','invalid_token','error','skipped')),
  reason text check (reason is null or char_length(reason) <= 120),
  created_at timestamptz not null default now()
);
create index wallet_push_events_ts on public.wallet_push_events (created_at desc);
alter table public.wallet_push_events enable row level security;
create policy wallet_push_events_admin on public.wallet_push_events for select to authenticated using (public.is_admin());
revoke insert, update, delete on public.wallet_push_events from anon, authenticated;

-- Interruptor do cliente "avisos de pontos" (aviso de serviço; ligado por omissão, desliga-se no perfil).
alter table public.profiles add column if not exists wallet_points_alerts boolean not null default true;
