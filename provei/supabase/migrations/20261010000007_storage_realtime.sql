-- Provei: buckets de Storage e Realtime (só existem no Supabase; ignorado noutros Postgres)
do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'storage') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('media', 'media', true, 104857600, array['image/jpeg','image/png','image/webp','video/mp4','video/quicktime'])
    on conflict (id) do nothing;

    -- caminhos: restaurants/<restaurant_id>/... (dono) e users/<user_id>/... (próprio)
    execute $p$create policy "media_read" on storage.objects for select using (bucket_id = 'media')$p$;
    execute $p$create policy "media_insert_restaurant" on storage.objects for insert to authenticated
      with check (bucket_id = 'media' and (storage.foldername(name))[1] = 'restaurants'
        and public.is_owner(((storage.foldername(name))[2])::uuid))$p$;
    execute $p$create policy "media_insert_user" on storage.objects for insert to authenticated
      with check (bucket_id = 'media' and (storage.foldername(name))[1] = 'users'
        and (storage.foldername(name))[2] = auth.uid()::text)$p$;
    execute $p$create policy "media_delete_restaurant" on storage.objects for delete to authenticated
      using (bucket_id = 'media' and (storage.foldername(name))[1] = 'restaurants'
        and public.is_owner(((storage.foldername(name))[2])::uuid))$p$;
  end if;
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.waiter_calls;
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;
