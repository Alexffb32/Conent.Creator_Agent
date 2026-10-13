import type { Metadata } from 'next';
import { requireUser } from '@/server/auth';
import { WithdrawForm } from './WithdrawForm';

export const metadata: Metadata = { title: 'Terminar assinatura', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function LivreResolucaoPage() {
  const me = await requireUser('/perfil/livre-resolucao');
  return (
    <div className="pv-container flex max-w-prose flex-col gap-4 py-8">
      <h1 className="pv-title text-4xl text-verde-escuro">Terminar assinatura</h1>
      <p>Aqui podes terminar a assinatura Provei sem anúncios.</p>
      <ul className="flex list-disc flex-col gap-1 pl-6">
        <li>Nos primeiros 14 dias: livre resolução, sem indicar motivo. A assinatura termina já e devolvemos o valor pago pelo mesmo meio de pagamento, no máximo em 14 dias.</li>
        <li>Depois disso: a assinatura não é renovada e mantém-se ativa até ao fim do período pago.</li>
      </ul>
      <p className="text-tinta-2">Enviamos a confirmação para {me.email ?? 'o teu e-mail'}. [VERIFY: redação obrigatória do botão segundo a transposição da Diretiva (UE) 2023/2673]</p>
      <WithdrawForm active={me.isAdFree} />
    </div>
  );
}
