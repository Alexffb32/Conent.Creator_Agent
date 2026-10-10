/**
 * Dados de exemplo do Provei. Uso: pnpm seed   (lê .env.local)
 * Tudo o que cria está marcado como fictício (is_demo). Idempotente: pode correr-se mais vezes.
 *   pnpm seed -- --reset   apaga primeiro os dados fictícios
 */
import { createClient } from '@supabase/supabase-js';
import { DEFAULT_LEVELS, levelFor } from '@provei/domain';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Faltam NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (ver .env.example).');
  process.exit(1);
}
const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

// pseudo-aleatório determinístico para o seed ser repetível
let seed = 20261010;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
const pick = <T,>(a: readonly T[]) => a[Math.floor(rnd() * a.length)]!;
const int = (a: number, b: number) => a + Math.floor(rnd() * (b - a + 1));

const CENTER = { Covilhã: { lat: 40.2811, lng: -7.5042 }, Fundão: { lat: 40.1383, lng: -7.5008 } } as const;

const RESTAURANTS = [
  { slug: 'exemplo-sabores-da-serra', name: 'Sabores da Serra', city: 'Covilhã', cuisine: ['Portuguesa', 'Tradicional'], price: 2, plan: 'paid' },
  { slug: 'exemplo-tasca-do-castelo', name: 'Tasca do Castelo', city: 'Covilhã', cuisine: ['Petiscos', 'Portuguesa'], price: 1, plan: 'free' },
  { slug: 'exemplo-forno-lenha', name: 'Forno a Lenha Beira', city: 'Covilhã', cuisine: ['Pizzaria', 'Italiana'], price: 2, plan: 'paid' },
  { slug: 'exemplo-cafe-estudantes', name: 'Café dos Estudantes', city: 'Covilhã', cuisine: ['Café', 'Snacks'], price: 1, plan: 'free' },
  { slug: 'exemplo-sushi-neve', name: 'Sushi da Neve', city: 'Covilhã', cuisine: ['Japonesa'], price: 3, plan: 'free' },
  { slug: 'exemplo-cantinho-cereja', name: 'Cantinho da Cereja', city: 'Fundão', cuisine: ['Portuguesa', 'Doces'], price: 2, plan: 'free' },
  { slug: 'exemplo-adega-pomar', name: 'Adega do Pomar', city: 'Fundão', cuisine: ['Portuguesa', 'Vinhos'], price: 3, plan: 'free' },
  { slug: 'exemplo-hamburgueria-gardunha', name: 'Hamburgueria Gardunha', city: 'Fundão', cuisine: ['Hambúrgueres'], price: 2, plan: 'free' },
  { slug: 'exemplo-vegan-oliveira', name: 'Oliveira Verde', city: 'Fundão', cuisine: ['Vegetariana', 'Saudável'], price: 2, plan: 'free' },
  { slug: 'exemplo-marisqueira-zezere', name: 'Marisqueira do Zêzere', city: 'Covilhã', cuisine: ['Marisco', 'Peixe'], price: 3, plan: 'free' },
  { slug: 'exemplo-pastelaria-queijo', name: 'Pastelaria do Queijo', city: 'Fundão', cuisine: ['Pastelaria'], price: 1, plan: 'free' },
  { slug: 'exemplo-grelhados-ponte', name: 'Grelhados da Ponte', city: 'Covilhã', cuisine: ['Grelhados', 'Carnes'], price: 2, plan: 'free' },
] as const;

const DISHES = ['Bacalhau com broa', 'Cabrito assado', 'Posta mirandesa', 'Francesinha da casa', 'Arroz de pato', 'Queijo da Serra com mel', 'Pizza de enchidos', 'Hambúrguer de vitela', 'Tártaro de atum', 'Bowl de legumes', 'Pastel de nata', 'Cheesecake de cereja', 'Sopa da pedra', 'Polvo à lagareiro', 'Bifana crocante', 'Salada de laranja e feta', 'Risotto de cogumelos', 'Tosta de presunto', 'Tarte de maçã', 'Caldeirada de peixe'];
const CAPTIONS = ['Acabadinho de sair da cozinha.', 'O favorito da casa.', 'Feito com produto da região.', 'Prato do dia: vem provar.', 'Para partilhar (ou não).'];
const MENU_CATS = [['Entradas', ['Pão e azeitonas', 'Queijo curado', 'Salada da casa']], ['Pratos', ['Prato do dia', 'Grelhado misto', 'Massa da casa']], ['Sobremesas', ['Pudim', 'Tarte da avó', 'Gelado artesanal']]] as const;
const REVIEWS = [
  [5, 'Adorei! Prato bem servido e atendimento simpático.'], [4, 'Muito bom, voltarei com certeza.'], [5, 'O melhor da zona, sem dúvida.'],
  [3, 'Comida boa, mas demorou um pouco a chegar.'], [4, 'Bom ambiente e preços justos.'], [5, 'Sobremesa a não perder.'], [2, 'Esperava mais pelo preço.'],
] as const;

async function must<T>(p: PromiseLike<{ data: T; error: { message: string } | null }>, what: string): Promise<NonNullable<T>> {
  const { data, error } = await p;
  if (error) throw new Error(`${what}: ${error.message}`);
  if (data == null) throw new Error(`${what}: sem resultado`);
  return data as NonNullable<T>;
}

async function ensureUser(email: string, name: string, extra: Record<string, unknown> = {}) {
  const list = await sb.auth.admin.listUsers({ page: 1, perPage: 1000 });
  let user = list.data.users.find((u) => u.email === email);
  if (!user) {
    const r = await sb.auth.admin.createUser({ email, email_confirm: true, user_metadata: { full_name: name } });
    if (r.error || !r.data.user) throw new Error(`createUser ${email}: ${r.error?.message}`);
    user = r.data.user;
  }
  const handle = email.split('@')[0]!.replace(/[^a-z0-9_]/g, '_').slice(0, 24).padEnd(3, '_');
  await sb.from('profiles').update({ display_name: name, handle, city: pick(['Covilhã', 'Fundão']), onboarded_at: new Date().toISOString(), is_demo: true, consents: { terms: true, privacy: true, location: true, push: false, ads_personalization: false }, ...extra }).eq('id', user.id);
  return user.id;
}

async function reset() {
  console.log('A apagar dados fictícios…');
  const { data: rs } = await sb.from('restaurants').select('id').eq('is_demo', true);
  const ids = (rs ?? []).map((r) => r.id);
  if (ids.length) await sb.from('restaurants').delete().in('id', ids);
  await sb.from('ad_campaigns').delete().eq('is_demo', true);
  const { data: ps } = await sb.from('profiles').select('id').eq('is_demo', true);
  for (const p of ps ?? []) await sb.auth.admin.deleteUser(p.id);
}

async function main() {
  if (process.argv.includes('--reset')) await reset();

  // ---- utilizadores ----
  const adminId = await ensureUser('admin@provei.test', 'Admin Provei', { is_admin: true });
  const donoId = await ensureUser('dono@provei.test', 'Dona de Teste');
  const staffId = await ensureUser('staff@provei.test', 'Staff de Teste');
  const userId = await ensureUser('user@provei.test', 'Utilizador de Teste');
  const NAMES = ['Ana', 'Bruno', 'Carla', 'Diogo', 'Eva', 'Filipe', 'Graça', 'Hugo', 'Inês', 'João', 'Kátia', 'Luís', 'Marta', 'Nuno', 'Olga', 'Pedro'];
  const others: string[] = [];
  for (let i = 0; i < 16; i++) others.push(await ensureUser(`user${String(i + 1).padStart(2, '0')}@provei.test`, `${NAMES[i]} (teste)`));
  const allUsers = [userId, ...others];
  console.log('Utilizadores prontos:', allUsers.length + 3);

  // ---- restaurantes ----
  const restIds: { id: string; slug: string; city: 'Covilhã' | 'Fundão'; plan: string }[] = [];
  for (const [idx, r] of RESTAURANTS.entries()) {
    const c = CENTER[r.city as 'Covilhã' | 'Fundão'];
    const hours = Object.fromEntries(['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'].map((d) => [d, d === 'dom' && idx % 3 === 0 ? null : { open: '12:00', close: d === 'sex' || d === 'sab' ? '23:30' : '22:30' }]));
    const row = {
      slug: r.slug, name: r.name, city: r.city, cuisine: [...r.cuisine], price_level: r.price, plan: r.plan, plan_since: r.plan === 'paid' ? new Date().toISOString() : null,
      description: `Restaurante fictício de exemplo, criado para demonstrar o Provei. Não existe na vida real.`,
      address: `Rua de Exemplo ${int(1, 90)}, ${r.city}`, phone: `+351 2759${int(10000, 99999)}`,
      lat: c.lat + (rnd() - 0.5) * 0.02, lng: c.lng + (rnd() - 0.5) * 0.02, hours, verified_status: 'verified', is_demo: true,
      cover_path: `/seed/cover-${(idx % 8) + 1}.svg`, logo_path: `/seed/dish-${(idx % 8) + 1}.svg`,
    };
    const { data: existing } = await sb.from('restaurants').select('id').eq('slug', r.slug).maybeSingle();
    const id: string = existing?.id ?? (await must(sb.from('restaurants').insert(row).select('id').single(), `restaurante ${r.slug}`)).id;
    restIds.push({ id, slug: r.slug, city: r.city as 'Covilhã' | 'Fundão', plan: r.plan });
  }

  // donos e equipa
  const memberships = [
    [restIds[0]!.id, donoId, 'owner'], [restIds[1]!.id, donoId, 'owner'], [restIds[0]!.id, staffId, 'staff'],
    ...restIds.slice(2).map((r) => [r.id, others[Math.floor(rnd() * others.length)]!, 'owner'] as const),
  ];
  for (const [restaurant_id, user_id, role] of memberships) await sb.from('restaurant_members').upsert({ restaurant_id, user_id, role }, { onConflict: 'restaurant_id,user_id', ignoreDuplicates: true });

  // programa, mesas, menu
  for (const r of restIds) {
    await sb.from('loyalty_programs').upsert({ restaurant_id: r.id, stamps_required: 6, reward_text: 'Uma sobremesa por conta da casa' });
    const { count } = await sb.from('tables').select('id', { count: 'exact', head: true }).eq('restaurant_id', r.id);
    if (!count) await sb.from('tables').insert([1, 2, 3].map((n) => ({ restaurant_id: r.id, label: String(n), public_code: `${r.slug.replace(/[^a-z0-9]/g, '').slice(7, 13)}${String(n).padStart(2, '0')}${int(1000, 9999)}`.toLowerCase().padEnd(8, 'x') })));
    const { count: mc } = await sb.from('menu_categories').select('id', { count: 'exact', head: true }).eq('restaurant_id', r.id);
    if (!mc) {
      for (const [pos, [catName, items]] of MENU_CATS.entries()) {
        const cat = await must(sb.from('menu_categories').insert({ restaurant_id: r.id, name: catName, position: pos }).select('id').single(), 'categoria');
        await sb.from('menu_items').insert(items.map((name, i) => ({ restaurant_id: r.id, category_id: cat.id, name, price_cents: int(2, 18) * 100 + pick([0, 50]), position: i, description: 'Item de exemplo' })));
      }
    }
  }

  // ofertas (planos pagos)
  for (const r of restIds.filter((x) => x.plan === 'paid')) {
    const { count } = await sb.from('offers').select('id', { count: 'exact', head: true }).eq('restaurant_id', r.id);
    if (!count) await sb.from('offers').insert({ restaurant_id: r.id, title: 'Café por conta da casa ao almoço', description: 'Oferta de exemplo para clientes do Provei.', ends_at: new Date(Date.now() + 60 * 86_400_000).toISOString() });
  }

  // ---- publicações (40) ----
  const { count: postCount } = await sb.from('posts').select('id', { count: 'exact', head: true }).in('restaurant_id', restIds.map((r) => r.id));
  const postIds: { id: string; restaurant_id: string; type: string }[] = [];
  if (!postCount) {
    for (let i = 0; i < 40; i++) {
      const r = restIds[i % restIds.length]!;
      const isVideo = i % 7 === 0;
      const media = await must(
        sb.from('media_assets').insert({
          owner_restaurant_id: r.id, kind: isVideo ? 'video' : 'photo', storage_path: isVideo ? '/seed/demo.mp4' : `/seed/dish-${(i % 8) + 1}.svg`,
          poster_path: isVideo ? '/seed/demo-poster.jpg' : null, duration_ms: isVideo ? 8000 : null, status: 'ready', mime: isVideo ? 'video/mp4' : 'image/svg+xml',
        }).select('id').single(),
        'média',
      );
      const age = int(0, 20 * 24) * 3_600_000;
      const post = await must(
        sb.from('posts').insert({
          restaurant_id: r.id, type: isVideo ? 'video' : 'photo', media_id: media.id, dish_name: DISHES[i % DISHES.length]!, caption: pick(CAPTIONS), price_cents: int(4, 22) * 100 + pick([0, 50, 90]),
          tags: [pick(['peixe', 'carne', 'doce', 'vegetariano', 'tradicional'])], status: 'published', published_at: new Date(Date.now() - age).toISOString(), view_count: int(20, 900),
        }).select('id, restaurant_id, type').single(),
        'prato',
      ).catch(async (e) => {
        // limite do plano gratuito (8 por mês): normal; o seed só salta
        console.warn('  prato ignorado:', (e as Error).message);
        return null;
      });
      if (post) postIds.push(post);
    }
  } else {
    postIds.push(...(await must(sb.from('posts').select('id, restaurant_id, type').in('restaurant_id', restIds.map((r) => r.id)), 'pratos')));
  }
  console.log('Publicações:', postIds.length);

  // retenção de vídeo (para o plano pago)
  for (const p of postIds.filter((x) => x.type === 'video')) {
    const base = int(120, 400);
    for (let s = 0; s < 8; s++) await sb.from('video_watch_buckets').upsert({ post_id: p.id, second: s, views: Math.max(1, Math.round(base * Math.pow(0.86, s))) });
  }

  // ---- seguidores, guardados, visitas, cartões, avaliações ----
  for (const u of allUsers) {
    for (const r of restIds.filter(() => rnd() < 0.35)) await sb.from('follows').upsert({ user_id: u, restaurant_id: r.id }, { ignoreDuplicates: true });
    for (const p of postIds.filter(() => rnd() < 0.08)) await sb.from('saves').upsert({ user_id: u, post_id: p.id }, { ignoreDuplicates: true });
  }
  const dayMs = 86_400_000;
  for (const u of allUsers) {
    for (const r of restIds.filter(() => rnd() < 0.3)) {
      const { data: card0 } = await sb.from('loyalty_cards').select('id').eq('user_id', u).eq('restaurant_id', r.id).maybeSingle();
      if (card0) continue;
      const card = await must(sb.from('loyalty_cards').insert({ user_id: u, restaurant_id: r.id }).select('id').single(), 'cartão');
      const visits = int(1, 7);
      for (let v = 0; v < visits; v++) {
        const at = new Date(Date.now() - (v * 4 + int(1, 4)) * dayMs);
        const visit = await must(sb.from('visits').insert({ user_id: u, restaurant_id: r.id, level: 'qr', verified_at: at.toISOString(), points_awarded: v === visits - 1 ? 30 : 10 }).select('id').single(), 'visita');
        await sb.from('loyalty_events').insert({ card_id: card.id, type: 'stamp', delta: 1, visit_id: visit.id, reason: 'visita de exemplo', created_at: at.toISOString() });
        await sb.from('loyalty_events').insert({ card_id: card.id, type: 'points', delta: v === visits - 1 ? 30 : 10, visit_id: visit.id, reason: 'visita de exemplo', created_at: at.toISOString() });
      }
      if (visits >= 6) {
        await sb.from('redemptions').insert({ card_id: card.id, restaurant_id: r.id, user_id: u, reward_text: 'Uma sobremesa por conta da casa', code: `${pick(['EXMP', 'DEMO'])}-${int(1000, 9999)}`.replace(/[01OI]/g, 'X'), cycle: 0 });
        await sb.from('loyalty_events').insert({ card_id: card.id, type: 'redeem', delta: -6, reason: 'recompensa emitida' });
      }
      const { count: restVisits } = await sb.from('visits').select('id', { count: 'exact', head: true }).eq('user_id', u).eq('restaurant_id', r.id);
      const { data: c } = await sb.from('loyalty_cards').select('points').eq('id', card.id).single();
      await sb.from('loyalty_cards').update({ level: levelFor({ visits: restVisits ?? 0, points: c?.points ?? 0 }).key }).eq('id', card.id);
      // avaliação com selo de visita verificada
      if (rnd() < 0.7) {
        const [rating, text] = pick(REVIEWS);
        await sb.from('reviews').insert({ user_id: u, restaurant_id: r.id, rating, text: `${text} (avaliação de exemplo)`, verified: true, is_demo: true, created_at: new Date(Date.now() - int(1, 25) * dayMs).toISOString() });
      }
    }
    const { count: allVisits } = await sb.from('visits').select('id', { count: 'exact', head: true }).eq('user_id', u);
    const { data: pr } = await sb.from('profiles').select('points_total').eq('id', u).single();
    await sb.from('profiles').update({ level: levelFor({ visits: allVisits ?? 0, points: pr?.points_total ?? 0 }).key }).eq('id', u);
  }

  // ---- analytics dos últimos 30 dias ----
  for (const r of restIds) {
    const rows: { restaurant_id: string; day: string; type: string; count: number }[] = [];
    for (let d = 0; d < 30; d++) {
      const day = new Date(Date.now() - d * dayMs).toISOString().slice(0, 10);
      for (const [type, max] of [['view', 120], ['follow', 4], ['save', 12], ['visit', 8], ['call', 10]] as const) rows.push({ restaurant_id: r.id, day, type, count: int(0, max) });
    }
    await sb.from('analytics_daily').upsert(rows, { onConflict: 'restaurant_id,day,type' });
  }

  // ---- campanhas fictícias ----
  const { count: adCount } = await sb.from('ad_campaigns').select('id', { count: 'exact', head: true }).eq('is_demo', true);
  if (!adCount) {
    const starts = new Date(Date.now() - dayMs).toISOString();
    const ends = new Date(Date.now() + 30 * dayMs).toISOString();
    await sb.from('ad_campaigns').insert([
      { advertiser_name: 'Anunciante Fictício A', creative: { headline: 'Queijaria de exemplo', body: 'Anúncio fictício para demonstração.', url: 'https://example.com' }, targeting: { cities: ['Covilhã'], hours: [11, 12, 13, 19, 20] }, budget_cents: 5000, status: 'active', starts_at: starts, ends_at: ends, is_demo: true },
      { advertiser_name: 'Anunciante Fictício B', creative: { headline: 'Vinhos da Beira (exemplo)', body: 'Campanha fictícia.', url: 'https://example.com' }, targeting: { cities: ['Fundão', 'Covilhã'] }, budget_cents: 8000, status: 'active', starts_at: starts, ends_at: ends, is_demo: true },
      { advertiser_name: 'Anunciante Fictício C', creative: { headline: 'Pastelaria de exemplo', body: 'Campanha fictícia em pausa.' }, targeting: {}, budget_cents: 3000, status: 'paused', starts_at: starts, ends_at: ends, is_demo: true },
    ]);
  }

  console.log('\nSeed concluído.');
  console.log('Contas (entra com link mágico; no Supabase local abre o Inbucket em http://127.0.0.1:54324):');
  console.log('  admin@provei.test · dono@provei.test (2 restaurantes) · staff@provei.test · user@provei.test');
  console.log('Níveis:', DEFAULT_LEVELS.map((l) => l.label).join(' > '));
  void adminId;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
