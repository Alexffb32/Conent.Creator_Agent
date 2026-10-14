import type { Metadata } from 'next';
import Link from 'next/link';
import { ENTITY, LegalPage } from '@/components/legal/LegalPage';

export const metadata: Metadata = { title: 'Aviso legal', alternates: { canonical: '/legal/aviso-legal' } };

export default function AvisoLegalPage() {
  return (
    <LegalPage title="Aviso legal" updated="13 de outubro de 2026">
      <h2>Quem presta o serviço</h2>
      <p>Informação exigida pelo artigo 10.º do Decreto-Lei n.º 7/2004 (comércio eletrónico).</p>
      <ul>
        <li>Prestador: {ENTITY.name}, {ENTITY.form}</li>
        <li>NIF: {ENTITY.nif}</li>
        <li>Morada: {ENTITY.address}</li>
        <li>E-mail: <a href={`mailto:${ENTITY.email}`}>{ENTITY.email}</a></li>
        <li>Serviço: Provei, plataforma digital de descoberta de restaurantes, chamada de mesa e fidelização</li>
      </ul>
      <h2>Ponto de contacto (Regulamento dos Serviços Digitais)</h2>
      <p>
        Para utilizadores e autoridades, o ponto único de contacto é <a href={`mailto:${ENTITY.email}`}>{ENTITY.email}</a>, em português ou inglês (artigos 11.º e 12.º do Regulamento (UE) 2022/2065).
        Para denunciar conteúdo ilegal usa o <Link href="/denunciar">formulário de denúncia</Link>.
      </p>
      <h2>Reclamações e resolução de litígios</h2>
      <ul>
        <li>
          Livro de Reclamações Eletrónico: <a href="https://www.livroreclamacoes.pt/" target="_blank" rel="noopener noreferrer">www.livroreclamacoes.pt</a> [VERIFY obrigatoriedade para este serviço]
        </li>
        <li>
          Em caso de litígio de consumo, podes recorrer a uma entidade de resolução alternativa de litígios (Lei n.º 144/2015): CNIACC, Centro Nacional de Informação e Arbitragem de Conflitos de Consumo,{' '}
          <a href="https://www.cniacc.pt/" target="_blank" rel="noopener noreferrer">www.cniacc.pt</a>, geral@cniacc.pt [VERIFY competência para o distrito de Castelo Branco].
        </li>
      </ul>
      <h2>Restaurantes e conteúdos</h2>
      <p>Os pratos, fotos, vídeos, preços, ofertas e menus são publicados pelos próprios restaurantes, que respondem pela sua exatidão. Os restaurantes marcados &quot;Fictício&quot; ou &quot;Exemplo&quot; são dados de demonstração.</p>
    </LegalPage>
  );
}
