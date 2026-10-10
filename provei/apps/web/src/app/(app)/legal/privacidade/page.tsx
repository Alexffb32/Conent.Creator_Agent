import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Política de privacidade' };

export default function PrivacidadePage() {
  return (
    <article className="pv-container max-w-2xl py-8">
      <p role="note" className="mb-6 rounded-m bg-amarelo-tinta p-3 text-sm font-semibold">Texto-modelo. Rever por jurista antes de publicar.</p>
      <h1 className="pv-title mb-4 text-4xl text-verde-escuro">Política de privacidade</h1>
      <div className="flex flex-col gap-4 text-tinta">
        <p>Tratamos os teus dados pessoais de acordo com o RGPD. Esta página resume o que recolhemos e porquê.</p>
        <h2 className="pv-title text-2xl">O que recolhemos</h2>
        <ul className="list-disc pl-6">
          <li>E-mail, nome e nome de utilizador (conta).</li>
          <li>Cidade e, se deres consentimento, localização aproximada (para ordenar por proximidade).</li>
          <li>Seguidos, guardados, avaliações, visitas verificadas, pontos e carimbos.</li>
          <li>Estatísticas de utilização próprias (sem rastreadores de terceiros).</li>
        </ul>
        <h2 className="pv-title text-2xl">Consentimentos</h2>
        <p>Localização, notificações e personalização de anúncios são opcionais, separados e revogáveis em Perfil &gt; Definições. Sem consentimento de personalização, os anúncios usam apenas a cidade e a hora.</p>
        <h2 className="pv-title text-2xl">Os teus direitos</h2>
        <p>Podes exportar os teus dados em JSON e apagar a conta nas definições. A conta é desativada de imediato e removida definitivamente após o prazo de retenção. Os dados estatísticos são anonimizados ao fim de 13 meses.</p>
        <h2 className="pv-title text-2xl">Venda de dados</h2>
        <p>Nunca vendemos dados pessoais.</p>
        <h2 className="pv-title text-2xl">Contacto</h2>
        <p>ola@provei.pt (endereço provisório).</p>
      </div>
    </article>
  );
}
