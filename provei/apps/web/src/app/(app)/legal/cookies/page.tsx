import type { Metadata } from 'next';
import { LegalPage } from '@/components/legal/LegalPage';

export const metadata: Metadata = { title: 'Cookies', alternates: { canonical: '/legal/cookies' } };

const ROWS: [string, string, string, string][] = [
  ['sb-…-auth-token', 'Cookie (Supabase)', 'Manter a sessão depois de entrares', 'Até saíres da conta ou o token expirar'],
  ['pv_lang', 'Cookie', 'Lembrar o idioma que escolheste (PT/EN)', '12 meses'],
  ['pv_loc', 'Cookie', 'Guardar a localização aproximada para o separador "Perto", só se a autorizares', '30 minutos'],
  ['pv_q_sound / pv_q_vib', 'Armazenamento local', 'Preferências de som e vibração no ecrã de chamadas da equipa do restaurante', 'Até as apagares'],
  ['Cache do service worker', 'Armazenamento do navegador', 'Mostrar a página offline e carregar a app mais depressa', 'Até a app ser atualizada'],
];

export default function CookiesPage() {
  return (
    <LegalPage title="Cookies e armazenamento" updated="13 de outubro de 2026">
      <p>O Provei só usa cookies e armazenamento local necessários para funcionar ou para lembrar escolhas que fazes. Não usamos cookies de publicidade, de análise de terceiros nem de redes sociais.</p>
      <p>
        Por isso não mostramos uma faixa de consentimento: a Lei n.º 41/2004 (artigo 5.º) dispensa o consentimento para o armazenamento estritamente necessário para prestar o serviço que pedes [VERIFY: enquadramento de pv_lang e pv_loc].
        Se um dia passarmos a usar cookies que precisem de consentimento, pedimos antes de os ativar.
      </p>
      <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Tabela (desliza para ver tudo)">
        <table>
          <caption className="sr-only">Cookies e armazenamento usados</caption>
          <thead>
            <tr><th scope="col">Nome</th><th scope="col">Tipo</th><th scope="col">Para quê</th><th scope="col">Duração</th></tr>
          </thead>
          <tbody>
            {ROWS.map((r) => (
              <tr key={r[0]}>{r.map((c, i) => <td key={i}>{c}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </div>
      <h2>Mapa</h2>
      <p>O mapa só carrega quando carregas em &quot;Mostrar mapa&quot;. Nesse momento, o teu navegador pede imagens ao OpenStreetMap, que recebe o teu endereço IP. O OpenStreetMap não coloca cookies.</p>
      <h2>Como apagar</h2>
      <p>Podes apagar cookies e armazenamento nas definições do navegador. Se apagares o cookie de sessão, sais da conta.</p>
    </LegalPage>
  );
}
