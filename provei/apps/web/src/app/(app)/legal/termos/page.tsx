import type { Metadata } from 'next';
import Link from 'next/link';
import { ENTITY, LegalPage } from '@/components/legal/LegalPage';
import { eur, pricing } from '@/lib/pricing';

export const metadata: Metadata = { title: 'Termos de utilização', alternates: { canonical: '/legal/termos' } };

export default function TermosPage() {
  return (
    <LegalPage title="Termos de utilização" updated="13 de outubro de 2026">
      <p>
        Estes termos regem o uso do Provei, prestado por {ENTITY.name} ({ENTITY.form}, NIF {ENTITY.nif}). Ao criares conta aceitas estes termos e a{' '}
        <Link href="/legal/privacidade">política de privacidade</Link>. O uso do Provei como cliente é gratuito.
      </p>
      <h2>1. O que é o Provei</h2>
      <p>Uma plataforma onde restaurantes publicam pratos, menus e ofertas, e onde os clientes seguem, guardam, avaliam, entram na mesa por QR ou NFC, chamam a equipa e acumulam carimbos e pontos. Só os restaurantes publicam no feed.</p>
      <h2>2. Conta</h2>
      <ul>
        <li>Precisas de ter pelo menos 13 anos.</li>
        <li>Entras com um link enviado para o teu e-mail (ou com Google, se disponível). És responsável pela atividade na tua conta.</li>
        <li>Podes apagar a conta a qualquer momento em <Link href="/perfil/definicoes">Perfil › Definições</Link>.</li>
      </ul>
      <h2>3. Regras de conteúdo e moderação</h2>
      <p>Não é permitido publicar conteúdo ilegal, ofensivo, discriminatório, enganoso, que viole direitos de terceiros, nem avaliações falsas, pagas ou de quem não foi cliente. As avaliações marcadas &quot;Visita verificada&quot; vêm de uma visita confirmada na mesa.</p>
      <p>
        Analisamos as denúncias e podemos remover conteúdo, limitar a sua visibilidade, anular pontos ou suspender contas que violem estas regras. Usamos verificações automáticas simples (limites de frequência e de pedidos) e decisões humanas; não usamos decisões totalmente automáticas para remover conteúdo.
        Quando tomamos uma destas medidas, explicamos-te o motivo e como podes contestar (artigo 17.º do Regulamento (UE) 2022/2065).
      </p>
      <p>
        Para denunciar conteúdo ilegal usa o <Link href="/denunciar">formulário de denúncia</Link>. Para contestar uma decisão, responde ao e-mail que te enviámos ou escreve para{' '}
        <a href={`mailto:${ENTITY.email}`}>{ENTITY.email}</a>.
      </p>
      <h2>4. Pontos, carimbos e recompensas</h2>
      <p>Os carimbos e pontos são atribuídos por visitas confirmadas na mesa. As regras e recompensas de cada cartão são definidas por cada restaurante, que é responsável por as cumprir. Pontos e recompensas não têm valor em dinheiro nem podem ser transferidos. Tentativas de fraude levam à anulação dos pontos.</p>
      <h2>5. Conteúdo dos restaurantes</h2>
      <p>Os restaurantes são responsáveis pelo que publicam (pratos, preços, alergénios, ofertas, horários) e garantem que têm os direitos sobre as fotos e vídeos. Concedem ao Provei uma licença não exclusiva e gratuita para os mostrar na plataforma enquanto estiverem publicados.</p>
      <h2>6. Assinatura sem anúncios (quando disponível)</h2>
      <p>
        Assinatura mensal de {eur(pricing.adFreeEur)} (IVA incluído), renovação automática e cancelamento a qualquer momento. Tens 14 dias para exercer o direito de livre resolução, sem indicar motivo (Decreto-Lei n.º 24/2014),
        através da página <Link href="/perfil/livre-resolucao">Terminar assinatura</Link>. Esta funcionalidade ainda não está ativa.
      </p>
      <h2>7. Disponibilidade e responsabilidade</h2>
      <p>O Provei está em desenvolvimento e pode ter interrupções. Se a chamada da mesa falhar, o serviço do restaurante continua normalmente. Nada nestes termos limita os direitos que a lei te garante como consumidor.</p>
      <h2>8. Alterações</h2>
      <p>Se alterarmos estes termos de forma relevante, avisamos-te na app ou por e-mail com antecedência razoável.</p>
      <h2>9. Litígios</h2>
      <p>
        Aplica-se a lei portuguesa. Podes recorrer ao Livro de Reclamações e a uma entidade de resolução alternativa de litígios: vê o <Link href="/legal/aviso-legal">aviso legal</Link>.
      </p>
    </LegalPage>
  );
}
