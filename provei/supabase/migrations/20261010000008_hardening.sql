-- Endurecimento depois dos "advisors" do Supabase.
-- Funções de trigger não devem ser chamáveis por RPC (/rest/v1/rpc/...).
revoke execute on function public.apply_loyalty_event() from public, anon, authenticated;
revoke execute on function public.bump_follower_count() from public, anon, authenticated;
revoke execute on function public.bump_save_count() from public, anon, authenticated;
revoke execute on function public.bump_review_flags() from public, anon, authenticated;
revoke execute on function public.enforce_offers_plan() from public, anon, authenticated;
revoke execute on function public.enforce_post_limit() from public, anon, authenticated;
revoke execute on function public.enforce_table_limit() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- Tabelas só acessíveis ao servidor (service_role): política explícita de negação.
create policy deny_all on public.rate_limits for all to anon, authenticated using (false) with check (false);
create policy deny_all on public.stripe_events for all to anon, authenticated using (false) with check (false);
create policy deny_all on public.table_token_uses for all to anon, authenticated using (false) with check (false);

comment on view public.public_profiles is 'Vista pública intencional (security definer): expõe só id, nome, handle, avatar e nível.';
