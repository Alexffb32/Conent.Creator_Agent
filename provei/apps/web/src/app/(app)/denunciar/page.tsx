import type { Metadata } from 'next';
import { NoticeForm } from './NoticeForm';

export const metadata: Metadata = { title: 'Denunciar conteúdo', alternates: { canonical: '/denunciar' } };

export default async function DenunciarPage({ searchParams }: { searchParams: Promise<{ url?: string }> }) {
  const sp = await searchParams;
  return (
    <div className="pv-container flex max-w-prose flex-col gap-4 py-8">
      <h1 className="pv-title text-4xl text-verde-escuro">Denunciar conteúdo</h1>
      <p>Usa este formulário para nos avisar de conteúdo que consideras ilegal no Provei (artigo 16.º do Regulamento dos Serviços Digitais). Não precisas de ter conta.</p>
      <p className="text-tinta-2">Analisamos cada denúncia e respondemos para o e-mail que indicares com a decisão e o motivo. Se tens conta, também podes usar o botão &quot;Denunciar&quot; junto a cada avaliação.</p>
      <NoticeForm defaultUrl={sp.url?.slice(0, 500) ?? ''} />
    </div>
  );
}
