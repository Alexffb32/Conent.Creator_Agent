import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Termos de utilização' };

export default function TermosPage() {
  return (
    <article className="pv-container max-w-2xl py-8">
      <p role="note" className="mb-6 rounded-m bg-amarelo-tinta p-3 text-sm font-semibold">Texto-modelo. Rever por jurista antes de publicar.</p>
      <h1 className="pv-title mb-4 text-4xl text-verde-escuro">Termos de utilização</h1>
      <div className="flex flex-col gap-4 text-tinta">
        <p>O Provei é uma rede social de restaurantes. Ao usares a aplicação aceitas estes termos.</p>
        <h2 className="pv-title text-2xl">1. O que é o Provei</h2>
        <p>Um feed de pratos publicados por restaurantes, com ferramentas para seguir, guardar, avaliar, entrar na mesa e acumular pontos. Só os restaurantes publicam no feed.</p>
        <h2 className="pv-title text-2xl">2. A tua conta</h2>
        <p>Entras com o teu e-mail ou com Google. És responsável pela atividade na tua conta. Podes apagá-la a qualquer momento nas definições.</p>
        <h2 className="pv-title text-2xl">3. Avaliações</h2>
        <p>Avalia com honestidade e sem linguagem ofensiva. Avaliações falsas, difamatórias ou abusivas podem ser removidas. Podes denunciar conteúdo que considerares inadequado.</p>
        <h2 className="pv-title text-2xl">4. Pontos e recompensas</h2>
        <p>Os pontos e carimbos são atribuídos por visitas verificadas e definidos por cada restaurante. Tentativas de fraude levam à anulação dos pontos e podem levar à suspensão da conta.</p>
        <h2 className="pv-title text-2xl">5. Conteúdo dos restaurantes</h2>
        <p>Os vídeos e fotos pertencem aos restaurantes, que concedem ao Provei licença para os mostrar na aplicação.</p>
        <h2 className="pv-title text-2xl">6. Contacto</h2>
        <p>ola@provei.pt (endereço provisório).</p>
      </div>
    </article>
  );
}
