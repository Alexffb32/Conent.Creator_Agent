-- Revisão independente: os donos só veem estatísticas agregadas (analytics_daily), nunca eventos com user_id.
-- (alter em vez de drop: mesmo efeito, aplicado assim na cloud a 2026-10-13)
alter policy analytics_select_owner on public.analytics_events using (false);

-- Formulários públicos: só o servidor (service_role) chama as funções; o hash do IP deixa de poder ser forjado pelo cliente.
revoke execute on function public.submit_lead(text, text, text, text, text, text) from anon, authenticated;
revoke execute on function public.submit_content_notice(text, text, text, text, text, boolean, text) from anon, authenticated;
grant execute on function public.submit_lead(text, text, text, text, text, text) to service_role;
grant execute on function public.submit_content_notice(text, text, text, text, text, boolean, text) to service_role;

-- Admin pode ler e atualizar pedidos de demonstração (as políticas permissivas somam-se ao deny_all).
create policy admin_read on public.leads for select to authenticated using (public.is_admin());
create policy admin_update on public.leads for update to authenticated using (public.is_admin()) with check (public.is_admin());
