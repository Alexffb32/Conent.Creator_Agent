-- Provei: RLS obrigatória em todas as tabelas. Sem política = sem acesso (só service_role).
do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- ---------- perfis ----------
revoke update on public.profiles from anon, authenticated;
grant update (display_name, handle, avatar_path, bio, city, locale, consents, onboarded_at) on public.profiles to authenticated;
create policy profiles_select_own on public.profiles for select to authenticated using (id = auth.uid() or public.is_admin());
create policy profiles_update_own on public.profiles for update to authenticated using (id = auth.uid() and deleted_at is null) with check (id = auth.uid());

-- vista pública (sem dados privados) usada em avaliações e perfis
create view public.public_profiles as
  select id, display_name, handle, avatar_path, level from public.profiles where deleted_at is null and suspended_at is null;
grant select on public.public_profiles to anon, authenticated;

-- ---------- restaurantes ----------
revoke update on public.restaurants from anon, authenticated;
grant update (name, description, cuisine, address, lat, lng, city, phone, website, hours, price_level, cover_path, logo_path, settings)
  on public.restaurants to authenticated;
create policy restaurants_select on public.restaurants for select to anon, authenticated
  using ((verified_status = 'verified' and deleted_at is null) or public.is_member(id) or public.is_admin());
create policy restaurants_update_owner on public.restaurants for update to authenticated
  using (public.is_owner(id)) with check (public.is_owner(id));

create policy members_select on public.restaurant_members for select to authenticated
  using (user_id = auth.uid() or public.is_member(restaurant_id) or public.is_admin());
create policy members_delete_staff on public.restaurant_members for delete to authenticated
  using (public.is_owner(restaurant_id) and role = 'staff');

create policy invites_select on public.restaurant_invites for select to authenticated using (public.is_owner(restaurant_id));
create policy invites_insert on public.restaurant_invites for insert to authenticated
  with check (public.is_owner(restaurant_id) and invited_by = auth.uid());
create policy invites_delete on public.restaurant_invites for delete to authenticated using (public.is_owner(restaurant_id));

-- ---------- flags e planos ----------
create policy flags_select on public.feature_flags for select to anon, authenticated using (true);
create policy flags_update_admin on public.feature_flags for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy rflags_select on public.restaurant_flags for select to authenticated using (public.is_member(restaurant_id) or public.is_admin());
create policy rflags_write_admin on public.restaurant_flags for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy plan_limits_select on public.plan_limits for select to anon, authenticated using (true);
create policy plans_select on public.plans for select to anon, authenticated using (true);

create policy audit_select on public.audit_logs for select to authenticated
  using (public.is_admin() or (restaurant_id is not null and public.is_owner(restaurant_id)));
create policy consents_select_own on public.consents for select to authenticated using (user_id = auth.uid());
create policy consents_insert_own on public.consents for insert to authenticated with check (user_id = auth.uid());

-- ---------- conteúdo ----------
create policy media_select on public.media_assets for select to anon, authenticated
  using (status = 'ready' or owner_user_id = auth.uid() or (owner_restaurant_id is not null and public.is_member(owner_restaurant_id)));
create policy media_insert on public.media_assets for insert to authenticated
  with check (owner_user_id = auth.uid() or (owner_restaurant_id is not null and public.is_owner(owner_restaurant_id)));
create policy media_update on public.media_assets for update to authenticated
  using (owner_user_id = auth.uid() or (owner_restaurant_id is not null and public.is_owner(owner_restaurant_id)));

create policy posts_select on public.posts for select to anon, authenticated
  using ((status = 'published' and deleted_at is null and public.restaurant_is_public(restaurant_id))
         or public.is_member(restaurant_id) or public.is_admin());
create policy posts_insert on public.posts for insert to authenticated with check (public.is_owner(restaurant_id));
create policy posts_update on public.posts for update to authenticated
  using (public.is_owner(restaurant_id) or public.is_admin()) with check (public.is_owner(restaurant_id) or public.is_admin());
create policy posts_delete on public.posts for delete to authenticated using (public.is_owner(restaurant_id));

create policy follows_select_own on public.follows for select to authenticated using (user_id = auth.uid());
create policy follows_insert_own on public.follows for insert to authenticated
  with check (user_id = auth.uid() and public.restaurant_is_public(restaurant_id));
create policy follows_delete_own on public.follows for delete to authenticated using (user_id = auth.uid());

create policy saves_select_own on public.saves for select to authenticated using (user_id = auth.uid());
create policy saves_insert_own on public.saves for insert to authenticated with check (user_id = auth.uid());
create policy saves_delete_own on public.saves for delete to authenticated using (user_id = auth.uid());

revoke update on public.notifications from anon, authenticated;
grant update (read_at) on public.notifications to authenticated;
create policy notif_select_own on public.notifications for select to authenticated using (user_id = auth.uid());
create policy notif_update_own on public.notifications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy notif_delete_own on public.notifications for delete to authenticated using (user_id = auth.uid());

create policy push_own on public.push_subscriptions for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy nprefs_own on public.notification_prefs for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy menu_cat_select on public.menu_categories for select to anon, authenticated
  using (public.restaurant_is_public(restaurant_id) or public.is_member(restaurant_id));
create policy menu_cat_write on public.menu_categories for all to authenticated
  using (public.is_owner(restaurant_id)) with check (public.is_owner(restaurant_id));
create policy menu_item_select on public.menu_items for select to anon, authenticated
  using (public.restaurant_is_public(restaurant_id) or public.is_member(restaurant_id));
create policy menu_item_write on public.menu_items for all to authenticated
  using (public.is_owner(restaurant_id)) with check (public.is_owner(restaurant_id));

create policy offers_select on public.offers for select to anon, authenticated
  using ((active and now() between starts_at and ends_at and public.restaurant_is_public(restaurant_id)) or public.is_member(restaurant_id));
create policy offers_write on public.offers for all to authenticated
  using (public.is_owner(restaurant_id)) with check (public.is_owner(restaurant_id));

create policy analytics_select_owner on public.analytics_events for select to authenticated using (public.is_owner(restaurant_id));
create policy analytics_daily_select on public.analytics_daily for select to authenticated using (public.is_owner(restaurant_id));
create policy watch_select on public.video_watch_buckets for select to authenticated
  using (exists (select 1 from public.posts p join public.restaurants r on r.id = p.restaurant_id
                 join public.plan_limits pl on pl.plan = r.plan
                 where p.id = post_id and public.is_owner(r.id) and pl.video_retention));

-- ---------- mesas ----------
create policy tables_select on public.tables for select to authenticated using (public.is_member(restaurant_id));
create policy tables_write on public.tables for all to authenticated
  using (public.is_owner(restaurant_id)) with check (public.is_owner(restaurant_id));
create policy tsessions_select on public.table_sessions for select to authenticated
  using (user_id = auth.uid() or public.is_member(restaurant_id));

revoke update on public.waiter_calls from anon, authenticated;
grant update (status, acknowledged_by, acknowledged_at, resolved_at) on public.waiter_calls to authenticated;
create policy calls_select on public.waiter_calls for select to authenticated using (user_id = auth.uid() or public.is_member(restaurant_id));
create policy calls_update_team on public.waiter_calls for update to authenticated
  using (public.is_member(restaurant_id)) with check (public.is_member(restaurant_id));

create policy blocks_select on public.restaurant_user_blocks for select to authenticated using (public.is_member(restaurant_id));
create policy blocks_write on public.restaurant_user_blocks for all to authenticated
  using (public.is_owner(restaurant_id)) with check (public.is_owner(restaurant_id));

-- ---------- visitas e fidelização ----------
create policy visits_select on public.visits for select to authenticated using (user_id = auth.uid() or public.is_member(restaurant_id));
create policy lprog_select on public.loyalty_programs for select to anon, authenticated
  using (public.restaurant_is_public(restaurant_id) or public.is_member(restaurant_id));
create policy lprog_write on public.loyalty_programs for all to authenticated
  using (public.is_owner(restaurant_id)) with check (public.is_owner(restaurant_id));
create policy lcards_select on public.loyalty_cards for select to authenticated using (user_id = auth.uid() or public.is_member(restaurant_id));
create policy levents_select on public.loyalty_events for select to authenticated
  using (exists (select 1 from public.loyalty_cards c where c.id = card_id and (c.user_id = auth.uid() or public.is_member(c.restaurant_id))));
create policy rewards_select on public.rewards for select to anon, authenticated
  using (public.restaurant_is_public(restaurant_id) or public.is_member(restaurant_id));
create policy rewards_write on public.rewards for all to authenticated
  using (public.is_owner(restaurant_id)) with check (public.is_owner(restaurant_id));
create policy redemptions_select on public.redemptions for select to authenticated using (user_id = auth.uid() or public.is_member(restaurant_id));

-- ---------- avaliações, feedback, denúncias ----------
create policy reviews_select on public.reviews for select to anon, authenticated
  using ((status = 'published' and public.restaurant_is_public(restaurant_id)) or user_id = auth.uid()
         or public.is_member(restaurant_id) or public.is_admin());
create policy replies_select on public.review_replies for select to anon, authenticated using (public.restaurant_is_public(restaurant_id) or public.is_member(restaurant_id));
create policy replies_insert on public.review_replies for insert to authenticated
  with check (public.is_owner(restaurant_id) and author_id = auth.uid());
create policy replies_delete on public.review_replies for delete to authenticated using (public.is_owner(restaurant_id));

create policy feedback_insert_own on public.private_feedback for insert to authenticated
  with check (user_id = auth.uid() and public.restaurant_is_public(restaurant_id));
create policy feedback_select on public.private_feedback for select to authenticated using (user_id = auth.uid() or public.is_owner(restaurant_id));

create policy reports_insert on public.reports for insert to authenticated with check (reporter_id = auth.uid());
create policy reports_select on public.reports for select to authenticated using (reporter_id = auth.uid() or public.is_admin());
create policy reports_update_admin on public.reports for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------- cobrança, anúncios, pedidos ----------
create policy subs_select on public.subscriptions for select to authenticated using (public.is_owner(restaurant_id) or public.is_admin());
create policy fees_select on public.install_fees for select to authenticated using (public.is_owner(restaurant_id) or public.is_admin());
create policy usubs_select on public.user_subscriptions for select to authenticated using (user_id = auth.uid());
create policy ads_admin on public.ad_campaigns for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy adimp_admin on public.ad_impressions for select to authenticated using (public.is_admin());
create policy adclk_admin on public.ad_clicks for select to authenticated using (public.is_admin());
create policy orders_select on public.orders for select to authenticated using (user_id = auth.uid() or public.is_member(restaurant_id));
create policy order_items_select on public.order_items for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.is_member(o.restaurant_id))));
