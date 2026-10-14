import type { Metadata } from 'next';
import { Badge, Card, CardTitle } from '@/components/ui';
import { createServiceSupabase } from '@/lib/supabase/server';
import { formatDateTime } from '@/lib/media';
import { walletCertificates } from '@/server/wallet/health';
import { walletAvailability } from '@/server/wallet';

export const metadata: Metadata = { title: 'Wallet' };
export const dynamic = 'force-dynamic';

const LEVEL = {
  ok: { tone: 'verde', text: 'Em dia' },
  warn_60: { tone: 'amarelo', text: 'Expira em menos de 60 dias' },
  warn_30: { tone: 'erro', text: 'Expira em menos de 30 dias — renovar já' },
  expired: { tone: 'erro', text: 'Expirado — cartões e atualizações falham' },
} as const;

export default async function AdminWalletPage() {
  const svc = createServiceSupabase();
  const since = new Date(Date.now() - 7 * 86400_000).toISOString();
  const [events, passes, regs] = await Promise.all([
    svc.from('wallet_push_events').select('platform, status, reason, created_at').gte('created_at', since).order('created_at', { ascending: false }).limit(1000),
    svc.from('wallet_passes').select('platform, voided', { count: 'exact' }).eq('is_synthetic', false),
    svc.from('wallet_registrations').select('pass_id', { count: 'exact', head: true }),
  ]);
  const ev = events.data ?? [];
  const count = (s: string, p = 'apple') => ev.filter((e) => e.status === s && e.platform === p).length;
  const certs = walletCertificates();
  const avail = walletAvailability();
  const rows = passes.data ?? [];
  const lastErrors = ev.filter((e) => e.status === 'error').slice(0, 10);
  return (
    <div className="flex flex-col gap-4">
      <h1 className="pv-title text-4xl text-verde-escuro">Wallet</h1>
      <Card className="flex flex-col gap-2">
        <CardTitle>Certificados Apple</CardTitle>
        {!certs ? (
          <p className="text-tinta-2">Sem certificados configurados {avail.appleSimulated ? '(modo simulado, só fora de produção)' : ''}. Ver docs/runbooks/wallet-cert-renewal.md.</p>
        ) : (
          (['signer', 'wwdr'] as const).map((k) => {
            const c = certs[k];
            if (!c) return <p key={k} className="text-erro">{k === 'signer' ? 'Certificado do Pass Type ID' : 'Certificado WWDR'} ilegível.</p>;
            const l = LEVEL[c.level];
            return (
              <p key={k} className="flex flex-wrap items-center gap-2">
                <strong>{k === 'signer' ? 'Pass Type ID' : 'Apple WWDR'}</strong> {c.subject} · expira {formatDateTime(c.notAfter)} ({c.daysLeft} dias)
                <Badge tone={l.tone}>{l.text}</Badge>
              </p>
            );
          })
        )}
      </Card>
      <Card className="flex flex-col gap-2">
        <CardTitle>Últimos 7 dias</CardTitle>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 tabular-nums sm:grid-cols-4">
          <dt>Push APNs enviados</dt><dd>{count('sent')}</dd>
          <dt>Tokens inválidos removidos</dt><dd>{count('invalid_token')}</dd>
          <dt>Erros APNs</dt><dd>{count('error')}</dd>
          <dt>Simulados (sem envio real)</dt><dd>{count('skipped')}</dd>
          <dt>Falhas Google Wallet</dt><dd>{count('error', 'google')}</dd>
          <dt>Cartões Apple ativos</dt><dd>{rows.filter((r) => r.platform === 'apple' && !r.voided).length}</dd>
          <dt>Cartões Google ativos</dt><dd>{rows.filter((r) => r.platform === 'google' && !r.voided).length}</dd>
          <dt>Dispositivos registados</dt><dd>{regs.count ?? 0}</dd>
        </dl>
        <p className="text-[15px] text-tinta-2">Custo por canal: o push da Apple e as atualizações da Google Wallet não têm custo por mensagem; o custo é a inscrição anual no Apple Developer Program [VERIFY preço em vigor].</p>
      </Card>
      {lastErrors.length > 0 && (
        <Card className="flex flex-col gap-2">
          <CardTitle>Erros recentes</CardTitle>
          <ul className="flex flex-col gap-1">
            {lastErrors.map((e, i) => <li key={i} className="text-[15px]">{formatDateTime(e.created_at)} · {e.platform} · {e.reason}</li>)}
          </ul>
        </Card>
      )}
    </div>
  );
}
