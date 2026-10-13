import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { BellRing, Camera, Gift, QrCode, Store, BarChart3 } from 'lucide-react';
import { Logo } from '@/components/brand/Logo';
import { LinkButton } from '@/components/ui';
import { eur, pricing } from '@/lib/pricing';
import { publicEnv } from '@/lib/env';
import { LeadForm } from './LeadForm';

const TITLE = 'Provei para restaurantes';
const DESCRIPTION = 'Mostre os pratos de hoje a quem está perto, receba chamadas da mesa por QR e fidelize com visitas verificadas. Covilhã e Fundão. Plano gratuito disponível.';

export const metadata: Metadata = {
  title: { absolute: `${TITLE}: pratos do dia, mesa por QR e fidelização` },
  description: DESCRIPTION,
  alternates: { canonical: '/para-restaurantes' },
  openGraph: { title: TITLE, description: DESCRIPTION, url: `${publicEnv.siteUrl}/para-restaurantes`, locale: 'pt_PT' },
};

const FAQ: { q: string; a: string }[] = [
  { q: 'Os clientes têm de instalar uma app?', a: 'Não. Leem o QR da mesa (ou encostam o telemóvel ao autocolante NFC) e o Provei abre no navegador. Quem quiser pode adicioná-lo ao ecrã inicial.' },
  { q: 'Cobram comissão por cliente ou por pedido?', a: 'Não. O Provei não cobra comissões. No plano pago paga uma instalação e uma mensalidade fixas; o plano gratuito não tem custos.' },
  { q: 'Quanto tempo leva a publicar um prato?', a: 'Escolhe a foto ou o vídeo, escreve o nome do prato (e o preço, se quiser) e carrega em Publicar. Leva menos de um minuto.' },
  { q: 'E se a equipa não vir a chamada da mesa?', a: 'As chamadas aparecem no ecrã da equipa por ordem de chegada, com som e vibração se os ligar. Se algo falhar, o serviço continua como sempre: o cliente chama com um aceno.' },
  { q: 'Como funciona o cartão de fidelização?', a: 'Cada visita confirmada na mesa conta um carimbo. Define quantos carimbos dão a recompensa (por exemplo, uma sobremesa). A confirmação exige estar na mesa e tem intervalos mínimos, para evitar abusos.' },
  { q: 'Onde ficam os dados?', a: 'A base de dados fica na União Europeia (Frankfurt). Não vendemos dados pessoais. Os clientes escolhem se partilham a localização.' },
  { q: 'Posso sair quando quiser?', a: 'Sim. O plano pago é mensal. Se cancelar, o restaurante continua no Provei com o plano gratuito.' },
];

export default function ParaRestaurantesPage() {
  const faqLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  };
  return (
    <div className="flex min-h-[100dvh] flex-col bg-branco">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd).replace(/</g, '\\u003c') }} />
      <header className="sticky top-0 z-40 border-b border-linha bg-branco/95 backdrop-blur pv-safe-top">
        <div className="pv-container flex h-16 items-center justify-between gap-3">
          <Link href="/" aria-label="Provei, ir para o início" className="inline-flex min-h-touch items-center"><Logo size={26} /></Link>
          <LinkButton href="#pedido" size="sm">Pedir visita</LinkButton>
        </div>
      </header>

      <main id="conteudo" className="flex-1">
        {/* 1. Herói: o resultado, para quem, e a ação */}
        <section className="pv-section bg-nevoa">
          <div className="pv-container grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="flex flex-col gap-5">
              <p className="text-sm font-semibold uppercase tracking-wide text-verde-escuro">Para restaurantes da Covilhã e do Fundão</p>
              <h1 className="pv-title text-[2.6rem] leading-[1.05] text-verde-escuro sm:text-6xl">Mostre os pratos de hoje a quem está perto e com fome.</h1>
              <p className="max-w-prose text-lg text-tinta">
                O Provei é um feed só de restaurantes. Publica o prato do dia em menos de um minuto, recebe chamadas da mesa por QR e fideliza clientes com visitas verificadas.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <LinkButton href="#pedido" size="lg">Pedir visita de demonstração</LinkButton>
                <Link href="/" className="pv-link inline-flex min-h-touch items-center font-semibold">Ver a app como cliente</Link>
              </div>
              <p className="text-sm text-tinta-2">Plano gratuito disponível. Sem comissões.</p>
            </div>
            <div className="relative mx-auto aspect-[4/5] w-full max-w-sm overflow-hidden rounded-xl border border-linha bg-verde-escuro shadow-lg">
              <Image src="/seed/dish-1.svg" alt="Exemplo ilustrativo de um prato no feed do Provei" fill priority sizes="(min-width:1024px) 384px, 90vw" className="object-cover" />
              <span className="absolute left-3 top-3 rounded-pill bg-amarelo px-3 py-1 text-sm font-semibold text-tinta">Ilustração</span>
            </div>
          </div>
        </section>

        {/* 2. Problema */}
        <section className="pv-section" aria-labelledby="problema">
          <div className="pv-container grid gap-8 lg:grid-cols-2">
            <h2 id="problema" className="pv-title text-4xl text-verde-escuro">Fazer bons pratos não chega se ninguém os vê.</h2>
            <div className="flex flex-col gap-4 text-lg">
              <p>Nas redes sociais gerais, o prato do dia compete com tudo o resto e chega sobretudo a quem já o segue, esteja onde estiver.</p>
              <p>Na sala, chamar a equipa ou pedir a conta depende de um olhar no momento certo. E o cartão de carimbos em papel perde-se na carteira.</p>
            </div>
          </div>
        </section>

        {/* 3. A nova forma */}
        <section className="pv-section bg-verde-tinta" aria-labelledby="como">
          <div className="pv-container flex flex-col gap-8">
            <h2 id="como" className="pv-title text-4xl text-verde-escuro">Como funciona</h2>
            <ol className="grid gap-4 md:grid-cols-3">
              {[
                { icon: Camera, t: 'Publica o prato', d: 'Foto ou vídeo, nome e preço. Aparece no feed de quem está na Covilhã e no Fundão, e de quem segue o restaurante.' },
                { icon: QrCode, t: 'O cliente senta-se e lê o QR', d: 'Sem instalar nada. Vê o menu, as ofertas e chama a equipa ou pede a conta com um toque.' },
                { icon: Gift, t: 'A visita conta para o cartão', d: 'Cada visita confirmada na mesa soma um carimbo. Ao completar, o cliente recebe a recompensa que definir.' },
              ].map((s, i) => (
                <li key={s.t} className="flex flex-col gap-3 rounded-m border border-linha bg-branco p-6 shadow-sm">
                  <span className="flex items-center gap-3">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-pill bg-verde font-semibold text-branco" aria-hidden>{i + 1}</span>
                    <s.icon className="text-verde" aria-hidden />
                  </span>
                  <h3 className="text-xl font-semibold text-tinta">{s.t}</h3>
                  <p className="text-tinta-2">{s.d}</p>
                </li>
              ))}
            </ol>
            <ul className="grid gap-3 sm:grid-cols-3">
              {[
                { icon: BellRing, t: 'Ecrã de chamadas para a equipa, com som e vibração opcionais' },
                { icon: BarChart3, t: 'Estatísticas: visualizações, seguidores e visitas' },
                { icon: Store, t: 'Página do restaurante com menu, horário e avaliações' },
              ].map((f) => (
                <li key={f.t} className="flex items-start gap-3 text-tinta"><f.icon className="mt-0.5 shrink-0 text-verde" aria-hidden />{f.t}</li>
              ))}
            </ul>
          </div>
        </section>

        {/* 4. Oferta */}
        <section className="pv-section" aria-labelledby="planos">
          <div className="pv-container flex flex-col gap-8">
            <div className="flex flex-col gap-2">
              <h2 id="planos" className="pv-title text-4xl text-verde-escuro">Planos</h2>
              <p className="text-tinta-2">Valores de arranque para os primeiros restaurantes. Preços sem IVA.</p>
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              <div className="flex flex-col gap-4 rounded-xl border border-linha-forte bg-branco p-6 shadow-sm">
                <h3 className="text-2xl font-semibold">Gratuito</h3>
                <p className="pv-title text-5xl text-verde-escuro">0 €</p>
                <ul className="flex flex-col gap-2 text-tinta">
                  <li>Página do restaurante e menu</li>
                  <li>Até 8 publicações por mês</li>
                  <li>Até 3 mesas com QR e chamada da equipa</li>
                  <li>Cartão de fidelização por carimbos</li>
                </ul>
              </div>
              <div className="flex flex-col gap-4 rounded-xl border-2 border-verde bg-branco p-6 shadow-md">
                <h3 className="text-2xl font-semibold">Provei</h3>
                <p><span className="pv-title text-5xl text-verde-escuro">{eur(pricing.monthlyEur)}</span> <span className="text-tinta-2">/mês + IVA</span></p>
                <p className="text-tinta-2">Instalação: {eur(pricing.installEur)} + IVA (configuração inicial do restaurante e das mesas).</p>
                <ul className="flex flex-col gap-2 text-tinta">
                  <li>Publicações e mesas sem limite</li>
                  <li>Ofertas na página e na mesa</li>
                  <li>Gráfico de retenção: em que segundo as pessoas deixam de ver cada vídeo</li>
                </ul>
                <LinkButton href="#pedido" className="mt-auto">Pedir visita de demonstração</LinkButton>
              </div>
            </div>
          </div>
        </section>

        {/* 5. Objeções */}
        <section className="pv-section bg-nevoa" aria-labelledby="faq">
          <div className="pv-container flex max-w-3xl flex-col gap-6">
            <h2 id="faq" className="pv-title text-4xl text-verde-escuro">Perguntas frequentes</h2>
            <div className="flex flex-col gap-3">
              {FAQ.map((f) => (
                <details key={f.q} className="group rounded-m border border-linha bg-branco shadow-sm">
                  <summary className="flex min-h-[56px] cursor-pointer list-none items-center justify-between gap-3 px-5 py-3 text-lg font-semibold">
                    {f.q}
                    <span aria-hidden className="text-2xl text-verde transition-transform duration-fast group-open:rotate-45">+</span>
                  </summary>
                  <p className="px-5 pb-5 text-tinta">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* 6. Ação */}
        <section id="pedido" className="pv-section scroll-mt-20" aria-labelledby="pedido-titulo">
          <div className="pv-container grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
            <div className="flex flex-col gap-3">
              <h2 id="pedido-titulo" className="pv-title text-4xl text-verde-escuro">Pedir visita de demonstração</h2>
              <p className="text-lg">Vamos ao restaurante, mostramos o Provei no seu telemóvel e respondemos às dúvidas. Sem compromisso.</p>
              <p className="text-tinta-2">Prefere escrever? <a href="mailto:ola@provei.pt" className="pv-link">ola@provei.pt</a></p>
            </div>
            <div className="relative rounded-xl border border-linha bg-branco p-5 shadow-md sm:p-8">
              <LeadForm />
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-linha bg-branco py-6 text-sm text-tinta-2">
        <nav aria-label="Legal" className="pv-container flex flex-wrap items-center gap-x-4">
          <span className="mr-auto">Provei · Covilhã e Fundão</span>
          <Link href="/legal/termos" className="inline-flex min-h-touch items-center hover:underline">Termos</Link>
          <Link href="/legal/privacidade" className="inline-flex min-h-touch items-center hover:underline">Privacidade</Link>
          <Link href="/legal/cookies" className="inline-flex min-h-touch items-center hover:underline">Cookies</Link>
          <Link href="/legal/aviso-legal" className="inline-flex min-h-touch items-center hover:underline">Aviso legal</Link>
          <a href="https://www.livroreclamacoes.pt/" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-touch items-center hover:underline">Livro de Reclamações</a>
        </nav>
      </footer>
    </div>
  );
}
