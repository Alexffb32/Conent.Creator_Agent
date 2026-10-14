-- Provei: dados de exemplo (todos fictícios, marcados com is_demo).
-- Corre sozinho no `supabase start`/`supabase db reset` (local) e pode aplicar-se no cloud.
-- Idempotente: pode correr-se mais vezes. Apagar: delete ... where is_demo.
do $$
declare
  u record; r record; p record;
  uid uuid; rid uuid; mid uuid; pid uuid; cid uuid; vid uuid; catid uuid;
  emails text[] := array['admin@provei.test','dono@provei.test','staff@provei.test','user@provei.test',
    'user01@provei.test','user02@provei.test','user03@provei.test','user04@provei.test','user05@provei.test','user06@provei.test',
    'user07@provei.test','user08@provei.test','user09@provei.test','user10@provei.test','user11@provei.test','user12@provei.test',
    'user13@provei.test','user14@provei.test','user15@provei.test','user16@provei.test'];
  names text[] := array['Admin Provei','Dona de Teste','Staff de Teste','Utilizador de Teste',
    'Ana (teste)','Bruno (teste)','Carla (teste)','Diogo (teste)','Eva (teste)','Filipe (teste)','Graça (teste)','Hugo (teste)',
    'Inês (teste)','João (teste)','Kátia (teste)','Luís (teste)','Marta (teste)','Nuno (teste)','Olga (teste)','Pedro (teste)'];
  dishes text[] := array['Bacalhau com broa','Cabrito assado','Posta mirandesa','Francesinha da casa','Arroz de pato','Queijo da Serra com mel',
    'Pizza de enchidos','Hambúrguer de vitela','Tártaro de atum','Bowl de legumes','Pastel de nata','Cheesecake de cereja','Sopa da pedra',
    'Polvo à lagareiro','Bifana crocante','Salada de laranja e feta','Risotto de cogumelos','Tosta de presunto','Tarte de maçã','Caldeirada de peixe'];
  captions text[] := array['Acabadinho de sair da cozinha.','O favorito da casa.','Feito com produto da região.','Prato do dia: vem provar.','Para partilhar (ou não).'];
  reviews_txt text[] := array['Adorei! Prato bem servido e atendimento simpático.','Muito bom, voltarei com certeza.','Comida boa, mas demorou um pouco a chegar.','Bom ambiente e preços justos.','Sobremesa a não perder.','Esperava mais pelo preço.'];
  reviews_rt int[] := array[5,4,3,4,5,2];
  i int; j int; n int; k int; rest_ids uuid[] := '{}'; post_ids uuid[] := '{}'; user_ids uuid[] := '{}';
  stamps_req int := 6; visits_n int; at timestamptz;
begin
  if exists (select 1 from public.restaurants where slug = 'exemplo-sabores-da-serra') then
    raise notice 'Seed já aplicado; nada a fazer.';
    return;
  end if;
  perform setseed(0.20261010);

  -- ---------- utilizadores ----------
  for i in 1..array_length(emails, 1) loop
    uid := md5('provei-user-' || emails[i])::uuid;
    insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change)
    values ('00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated', emails[i], '', now(),
      '{"provider":"email","providers":["email"]}', jsonb_build_object('full_name', names[i]), now(), now(), '', '', '', '')
    on conflict (id) do nothing;
    insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (gen_random_uuid(), uid, uid::text, jsonb_build_object('sub', uid::text, 'email', emails[i], 'email_verified', true), 'email', now(), now(), now())
    on conflict do nothing;
    update public.profiles set display_name = names[i],
      handle = left(regexp_replace(split_part(emails[i], '@', 1), '[^a-z0-9_]', '_', 'g'), 24),
      city = case when i % 2 = 0 then 'Covilhã' else 'Fundão' end,
      onboarded_at = now(), is_demo = true, is_admin = (i = 1),
      consents = '{"terms":true,"privacy":true,"location":true,"push":false,"ads_personalization":false}'
    where id = uid;
    user_ids := user_ids || uid;
  end loop;

  -- ---------- restaurantes ----------
  for r in select * from (values
    ('exemplo-sabores-da-serra','Sabores da Serra','Covilhã',array['Portuguesa','Tradicional'],2,'paid'),
    ('exemplo-tasca-do-castelo','Tasca do Castelo','Covilhã',array['Petiscos','Portuguesa'],1,'free'),
    ('exemplo-forno-lenha','Forno a Lenha Beira','Covilhã',array['Pizzaria','Italiana'],2,'paid'),
    ('exemplo-cafe-estudantes','Café dos Estudantes','Covilhã',array['Café','Snacks'],1,'free'),
    ('exemplo-sushi-neve','Sushi da Neve','Covilhã',array['Japonesa'],3,'free'),
    ('exemplo-cantinho-cereja','Cantinho da Cereja','Fundão',array['Portuguesa','Doces'],2,'free'),
    ('exemplo-adega-pomar','Adega do Pomar','Fundão',array['Portuguesa','Vinhos'],3,'free'),
    ('exemplo-hamburgueria-gardunha','Hamburgueria Gardunha','Fundão',array['Hambúrgueres'],2,'free'),
    ('exemplo-oliveira-verde','Oliveira Verde','Fundão',array['Vegetariana','Saudável'],2,'free'),
    ('exemplo-marisqueira-zezere','Marisqueira do Zêzere','Covilhã',array['Marisco','Peixe'],3,'free'),
    ('exemplo-pastelaria-queijo','Pastelaria do Queijo','Fundão',array['Pastelaria'],1,'free'),
    ('exemplo-grelhados-ponte','Grelhados da Ponte','Covilhã',array['Grelhados','Carnes'],2,'free')
  ) as t(slug, name, city, cuisine, price, plan) loop
    rid := md5('provei-rest-' || r.slug)::uuid;
    n := array_length(rest_ids, 1);
    insert into public.restaurants (id, slug, name, city, cuisine, price_level, plan, plan_since, description, address, phone,
      lat, lng, hours, verified_status, is_demo, cover_path, logo_path)
    values (rid, r.slug, r.name, r.city, r.cuisine, r.price, r.plan, case when r.plan = 'paid' then now() end,
      'Restaurante fictício de exemplo, criado para demonstrar o Provei. Não existe na vida real.',
      'Rua de Exemplo ' || (10 + coalesce(n, 0) * 7) || ', ' || r.city, '+351 275 900 ' || lpad((100 + coalesce(n, 0))::text, 3, '0'),
      case when r.city = 'Covilhã' then 40.2811 else 40.1383 end + (random() - 0.5) * 0.02,
      case when r.city = 'Covilhã' then -7.5042 else -7.5008 end + (random() - 0.5) * 0.02,
      '{"seg":{"open":"12:00","close":"22:30"},"ter":{"open":"12:00","close":"22:30"},"qua":{"open":"12:00","close":"22:30"},"qui":{"open":"12:00","close":"22:30"},"sex":{"open":"12:00","close":"23:30"},"sab":{"open":"12:00","close":"23:30"},"dom":null}',
      'verified', true, '/seed/cover-' || (coalesce(n, 0) % 8 + 1) || '.svg', '/seed/dish-' || (coalesce(n, 0) % 8 + 1) || '.svg');
    rest_ids := rest_ids || rid;

    insert into public.loyalty_programs (restaurant_id, stamps_required, reward_text, min_interval_hours)
    values (rid, stamps_req, 'Uma sobremesa por conta da casa', 12);
    for j in 1..3 loop
      insert into public.tables (restaurant_id, label, public_code)
      values (rid, j::text, left(regexp_replace(r.slug, '[^a-z0-9]', '', 'g'), 10) || lpad(j::text, 2, '0'));
    end loop;
    k := 0;
    for p in select * from (values ('Entradas', array['Pão e azeitonas','Queijo curado','Salada da casa']),
                                   ('Pratos', array['Prato do dia','Grelhado misto','Massa da casa']),
                                   ('Sobremesas', array['Pudim','Tarte da avó','Gelado artesanal'])) as m(cat, items) loop
      insert into public.menu_categories (restaurant_id, name, position) values (rid, p.cat, k) returning id into catid;
      for j in 1..3 loop
        insert into public.menu_items (restaurant_id, category_id, name, description, price_cents, position)
        values (rid, catid, p.items[j], 'Item de exemplo', (3 + floor(random() * 15))::int * 100 + (array[0,50])[1 + floor(random() * 2)::int], j);
      end loop;
      k := k + 1;
    end loop;
    if r.plan = 'paid' then
      insert into public.offers (restaurant_id, title, description, ends_at)
      values (rid, 'Café por conta da casa ao almoço', 'Oferta de exemplo para clientes do Provei.', now() + interval '60 days');
    end if;
  end loop;

  -- donos e equipa: dono@ tem os 2 primeiros; staff@ é equipa do primeiro
  insert into public.restaurant_members values (rest_ids[1], user_ids[2], 'owner', now()), (rest_ids[2], user_ids[2], 'owner', now()), (rest_ids[1], user_ids[3], 'waiter', now());
  for i in 3..12 loop
    insert into public.restaurant_members values (rest_ids[i], user_ids[4 + i], 'owner', now()) on conflict do nothing;
  end loop;

  -- ---------- 40 publicações ----------
  for i in 0..39 loop
    rid := rest_ids[(i % 12) + 1];
    insert into public.media_assets (owner_restaurant_id, kind, storage_path, poster_path, duration_ms, status, mime)
    values (rid, case when i % 7 = 0 then 'video' else 'photo' end,
      case when i % 7 = 0 then '/seed/demo.mp4' else '/seed/dish-' || (i % 8 + 1) || '.svg' end,
      case when i % 7 = 0 then '/seed/demo-poster.jpg' end, case when i % 7 = 0 then 8000 end, 'ready',
      case when i % 7 = 0 then 'video/mp4' else 'image/svg+xml' end)
    returning id into mid;
    insert into public.posts (restaurant_id, type, media_id, dish_name, caption, price_cents, tags, status, published_at, view_count)
    values (rid, case when i % 7 = 0 then 'video' else 'photo' end, mid, dishes[(i % 20) + 1], captions[(i % 5) + 1],
      (4 + floor(random() * 18))::int * 100 + (array[0,50,90])[1 + floor(random() * 3)::int],
      array[(array['peixe','carne','doce','vegetariano','tradicional'])[(i % 5) + 1]], 'published',
      now() - (floor(random() * 480) || ' hours')::interval, 20 + floor(random() * 880)::int)
    returning id into pid;
    post_ids := post_ids || pid;
    if i % 7 = 0 then
      n := 120 + floor(random() * 280)::int;
      for j in 0..7 loop
        insert into public.video_watch_buckets (post_id, second, views) values (pid, j, greatest(1, round(n * power(0.86, j))::int));
      end loop;
    end if;
  end loop;

  -- ---------- seguidores, guardados, visitas, cartões, avaliações ----------
  for i in 4..20 loop
    uid := user_ids[i];
    for j in 1..12 loop
      if random() < 0.35 then insert into public.follows (user_id, restaurant_id) values (uid, rest_ids[j]) on conflict do nothing; end if;
    end loop;
    for j in 1..40 loop
      if random() < 0.08 then insert into public.saves (user_id, post_id) values (uid, post_ids[j]) on conflict do nothing; end if;
    end loop;
    for j in 1..12 loop
      continue when random() >= 0.3;
      rid := rest_ids[j];
      insert into public.loyalty_cards (user_id, restaurant_id) values (uid, rid) returning id into cid;
      visits_n := 1 + floor(random() * 7)::int;
      for k in 0..visits_n - 1 loop
        at := now() - ((k * 4 + 1 + floor(random() * 3)) || ' days')::interval;
        insert into public.visits (user_id, restaurant_id, level, verified_at, points_awarded)
        values (uid, rid, 'qr', at, case when k = visits_n - 1 then 30 else 10 end) returning id into vid;
        insert into public.loyalty_events (card_id, type, delta, visit_id, reason, created_at) values
          (cid, 'stamp', 1, vid, 'visita de exemplo', at),
          (cid, 'points', case when k = visits_n - 1 then 30 else 10 end, vid, 'visita de exemplo', at);
      end loop;
      if visits_n >= stamps_req then
        insert into public.redemptions (card_id, restaurant_id, user_id, reward_text, code, cycle)
        values (cid, rid, uid, 'Uma sobremesa por conta da casa', 'DEMO-' || lpad((i * 100 + j)::text, 4, '0'), 0);
        insert into public.loyalty_events (card_id, type, delta, reason) values (cid, 'redeem', -stamps_req, 'recompensa emitida');
      end if;
      update public.loyalty_cards c set level = case
          when visits_n >= 25 or c.points >= 1000 then 'embaixador' when visits_n >= 10 or c.points >= 400 then 'habitual'
          when visits_n >= 3 or c.points >= 100 then 'provador' else 'convidado' end
        where c.id = cid;
      if random() < 0.7 then
        k := 1 + floor(random() * 6)::int;
        insert into public.reviews (user_id, restaurant_id, rating, text, verified, is_demo, created_at)
        values (uid, rid, reviews_rt[k], reviews_txt[k] || ' (avaliação de exemplo)', true, true, now() - ((1 + floor(random() * 25)) || ' days')::interval);
      end if;
    end loop;
  end loop;

  update public.profiles pr set level = case
      when v.n >= 25 or pr.points_total >= 1000 then 'embaixador' when v.n >= 10 or pr.points_total >= 400 then 'habitual'
      when v.n >= 3 or pr.points_total >= 100 then 'provador' else 'convidado' end
    from (select user_id, count(*) n from public.visits group by user_id) v where v.user_id = pr.id;

  -- ---------- métricas dos últimos 30 dias ----------
  insert into public.analytics_daily (restaurant_id, day, type, count)
  select rid2, (now() at time zone 'Europe/Lisbon')::date - d, t.type, floor(random() * t.mx)::int
  from unnest(rest_ids) rid2, generate_series(0, 29) d,
       (values ('view', 120), ('follow', 4), ('save', 12), ('visit', 8), ('call', 10)) t(type, mx)
  on conflict do nothing;

  -- ---------- campanhas fictícias ----------
  insert into public.ad_campaigns (advertiser_name, creative, targeting, budget_cents, status, starts_at, ends_at, is_demo) values
    ('Anunciante Fictício A', '{"headline":"Queijaria de exemplo","body":"Anúncio fictício para demonstração."}', '{"cities":["Covilhã"],"hours":[11,12,13,19,20]}', 5000, 'active', now() - interval '1 day', now() + interval '30 days', true),
    ('Anunciante Fictício B', '{"headline":"Vinhos da Beira (exemplo)","body":"Campanha fictícia."}', '{"cities":["Fundão","Covilhã"]}', 8000, 'active', now() - interval '1 day', now() + interval '30 days', true),
    ('Anunciante Fictício C', '{"headline":"Pastelaria de exemplo","body":"Campanha fictícia em pausa."}', '{}', 3000, 'paused', now() - interval '1 day', now() + interval '30 days', true);

  raise notice 'Seed concluído: % utilizadores, % restaurantes, % pratos', array_length(user_ids, 1), array_length(rest_ids, 1), array_length(post_ids, 1);
end $$;
