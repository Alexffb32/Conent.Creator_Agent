import type { Metadata } from 'next';
import Link from 'next/link';
import { ENTITY, LegalPage } from '@/components/legal/LegalPage';

export const metadata: Metadata = { title: 'Política de privacidade', alternates: { canonical: '/legal/privacidade' } };

const DATA: [string, string, string, string][] = [
  ['Conta: e-mail, nome, nome de utilizador, cidade', 'Criar e gerir a tua conta', 'Contrato (art. 6.º, n.º 1, al. b) RGPD)', 'Enquanto tiveres conta; apagados 30 dias depois de a apagares'],
  ['Escolhas de consentimento (localização, notificações, anúncios personalizados) e data', 'Respeitar e provar as tuas escolhas', 'Obrigação legal (art. 7.º, n.º 1 RGPD)', 'Enquanto tiveres conta'],
  ['Restaurantes que segues, pratos guardados', 'Mostrar o teu feed', 'Contrato', 'Até os removeres ou apagares a conta'],
  ['Sessões de mesa, chamadas à equipa, visitas confirmadas, carimbos, pontos e recompensas', 'Chamar a equipa e gerir o cartão de fidelização', 'Contrato', 'Enquanto tiveres conta'],
  ['Avaliações e denúncias que fazes', 'Publicar avaliações e moderar conteúdo', 'Contrato; interesse legítimo na moderação', 'Até as apagares ou apagares a conta'],
  ['Visualizações de pratos (incluindo até que segundo vês um vídeo)', 'Ordenar o feed e dar estatísticas agregadas aos restaurantes', 'Interesse legítimo (art. 6.º, n.º 1, al. f) RGPD)', 'Ligadas à conta durante 13 meses; depois anonimizadas'],
  ['Localização aproximada', 'Separador "Perto"', 'Consentimento', 'Só no teu navegador, 30 minutos; não a guardamos no servidor'],
  ['Subscrição de notificações push', 'Enviar notificações que pediste', 'Consentimento', 'Até as desligares'],
  ['Pedidos de demonstração (landing para restaurantes)', 'Responder ao pedido', 'Diligências pré-contratuais (art. 6.º, n.º 1, al. b) RGPD)', '12 meses'],
  ['Denúncias de conteúdo (nome opcional, e-mail, link, explicação)', 'Tratar a denúncia (Regulamento dos Serviços Digitais)', 'Obrigação legal', '24 meses'],
  ['Registos de segurança com IP transformado em código (hash) diário', 'Prevenir abusos e fraude', 'Interesse legítimo', 'Até 13 meses'],
];

const PROCESSORS: [string, string, string][] = [
  ['Supabase Inc.', 'Base de dados, contas, ficheiros (servidores em Frankfurt, Alemanha)', 'Empresa nos EUA; cláusulas contratuais-tipo / EU-US Data Privacy Framework [VERIFY]'],
  ['Vercel Inc.', 'Alojamento do site e entrega de conteúdos', 'EUA; EU-US Data Privacy Framework [VERIFY]'],
  ['Resend Inc.', 'Envio de e-mails (link de entrada, convites, confirmações)', 'EUA; cláusulas contratuais-tipo [VERIFY]'],
  ['OpenStreetMap Foundation', 'Imagens do mapa, só depois de carregares em "Mostrar mapa"', 'Reino Unido (decisão de adequação)'],
  ['Stripe (desligado nesta fase)', 'Pagamentos, quando existirem', 'EUA; EU-US Data Privacy Framework'],
];

export default function PrivacidadePage() {
  return (
    <LegalPage title="Política de privacidade" updated="13 de outubro de 2026">
      <h2>Quem é responsável</h2>
      <p>
        {ENTITY.name}, {ENTITY.form}, NIF {ENTITY.nif}, {ENTITY.address}. Contacto para privacidade: <a href={`mailto:${ENTITY.email}`}>{ENTITY.email}</a>.
        Não temos encarregado de proteção de dados designado, porque não é obrigatório para a nossa dimensão e atividade [VERIFY].
      </p>
      <h2>Que dados tratamos, para quê e durante quanto tempo</h2>
      <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Tabela (desliza para ver tudo)">
        <table>
          <caption className="sr-only">Dados pessoais tratados</caption>
          <thead><tr><th scope="col">Dados</th><th scope="col">Finalidade</th><th scope="col">Fundamento</th><th scope="col">Conservação</th></tr></thead>
          <tbody>{DATA.map((r) => <tr key={r[0]}>{r.map((c, i) => <td key={i}>{c}</td>)}</tr>)}</tbody>
        </table>
      </div>
      <p>Não vendemos dados pessoais. Os restaurantes veem estatísticas agregadas. A equipa de um restaurante vê o teu nome e nome de utilizador se tiveres cartão de fidelização nesse restaurante ou quando mostras o teu QR pessoal. As avaliações são públicas e mostram o teu nome.</p>
      <h2>Anúncios</h2>
      <p>Os anúncios estão desligados nesta fase. Quando existirem, aparecem sempre marcados &quot;Patrocinado&quot;. Sem o teu consentimento usamos só a cidade e a hora do dia; nunca partilhamos os teus dados com anunciantes.</p>
      <h2>Quem nos ajuda a tratar os dados</h2>
      <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Tabela (desliza para ver tudo)">
        <table>
          <caption className="sr-only">Subcontratantes</caption>
          <thead><tr><th scope="col">Entidade</th><th scope="col">Para quê</th><th scope="col">Onde / garantias</th></tr></thead>
          <tbody>{PROCESSORS.map((r) => <tr key={r[0]}>{r.map((c, i) => <td key={i}>{c}</td>)}</tr>)}</tbody>
        </table>
      </div>
      <h2>Idade mínima</h2>
      <p>Precisas de ter pelo menos 13 anos para criar conta (artigo 16.º da Lei n.º 58/2019).</p>
      <h2>Os teus direitos</h2>
      <ul>
        <li>Aceder aos teus dados e receber uma cópia (portabilidade).</li>
        <li>Corrigir dados errados e apagar a conta: em <Link href="/perfil/definicoes">Perfil › Definições</Link>.</li>
        <li>Retirar consentimentos a qualquer momento, também nas definições, sem afetar o que foi feito antes.</li>
        <li>Opor-te ao tratamento baseado em interesse legítimo e pedir a limitação do tratamento.</li>
      </ul>
      <p>Para pedidos, escreve para <a href={`mailto:${ENTITY.email}`}>{ENTITY.email}</a>. Respondemos no prazo de um mês.</p>
      <p>
        Podes apresentar reclamação à Comissão Nacional de Proteção de Dados (CNPD):{' '}
        <a href="https://www.cnpd.pt/" target="_blank" rel="noopener noreferrer">www.cnpd.pt</a>.
      </p>
      <h2>Segurança</h2>
      <p>Usamos ligações cifradas (HTTPS), regras de acesso na base de dados por utilizador e restaurante, links de entrada sem palavra-passe e registos de auditoria das ações sensíveis.</p>
      <h2>Cookies</h2>
      <p>Vê a <Link href="/legal/cookies">política de cookies</Link>.</p>
    </LegalPage>
  );
}
