'use client';
import { useState } from 'react';
import { Download, Trash2 } from 'lucide-react';
import { Button, Card, CardTitle, Checkbox, Field, Input, Textarea, useToast } from '@/components/ui';
import { deleteAccount, updateConsent, updateProfile } from '@/server/actions/account';

export function SettingsForms({ profile, consents }: { profile: { displayName: string; handle: string; city: string; bio: string }; consents: Record<'location' | 'push' | 'ads_personalization', boolean> }) {
  const { toast } = useToast();
  const [p, setP] = useState(profile);
  const [c, setC] = useState(consents);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<{ field?: string; message: string } | null>(null);
  const [confirmDel, setConfirmDel] = useState(false);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const r = await updateProfile(p);
    setBusy(false);
    if (!r.ok) return setErr({ field: r.field, message: r.error });
    toast('Perfil guardado');
  }
  async function toggle(kind: 'location' | 'push' | 'ads_personalization', granted: boolean) {
    setC((s) => ({ ...s, [kind]: granted }));
    const r = await updateConsent({ kind, granted });
    if (!r.ok) {
      setC((s) => ({ ...s, [kind]: !granted }));
      toast(r.error, 'erro');
    }
  }
  return (
    <>
      <Card>
        <CardTitle className="mb-3">O teu perfil</CardTitle>
        <form onSubmit={saveProfile} className="flex flex-col gap-3">
          <Field label="Nome" htmlFor="s-nome" error={err?.field === 'displayName' ? err.message : null}><Input id="s-nome" value={p.displayName} onChange={(e) => setP({ ...p, displayName: e.target.value })} /></Field>
          <Field label="Nome de utilizador" htmlFor="s-handle" error={err?.field === 'handle' ? err.message : null}><Input id="s-handle" value={p.handle} onChange={(e) => setP({ ...p, handle: e.target.value.toLowerCase() })} /></Field>
          <Field label="Cidade" htmlFor="s-cidade"><Input id="s-cidade" value={p.city} onChange={(e) => setP({ ...p, city: e.target.value })} /></Field>
          <Field label="Sobre ti" htmlFor="s-bio"><Textarea id="s-bio" maxLength={280} value={p.bio} onChange={(e) => setP({ ...p, bio: e.target.value })} /></Field>
          {err && !err.field ? <p role="alert" className="text-erro">{err.message}</p> : null}
          <Button type="submit" loading={busy}>Guardar</Button>
        </form>
      </Card>
      <Card className="flex flex-col gap-3">
        <CardTitle>Consentimentos</CardTitle>
        <p className="text-sm text-tinta-2">Podes mudar de ideias quando quiseres. Os termos e a privacidade são necessários para usar a conta.</p>
        <Checkbox checked={c.location} onChange={(e) => toggle('location', e.target.checked)} label="Usar a minha localização" description="Ordena os pratos por proximidade." />
        <Checkbox checked={c.push} onChange={(e) => toggle('push', e.target.checked)} label="Notificações" description="Novos pratos, pontos e recompensas." />
        <Checkbox checked={c.ads_personalization} onChange={(e) => toggle('ads_personalization', e.target.checked)} label="Anúncios mais relevantes" description="Sem isto só usamos cidade e hora." />
      </Card>
      <Card className="flex flex-col gap-3">
        <CardTitle>Os teus dados</CardTitle>
        <a href="/api/account/export" download className="inline-flex min-h-touch items-center justify-center gap-2 rounded-pill border border-linha bg-branco px-5 font-semibold text-verde-escuro hover:bg-verde-tinta">
          <Download size={18} aria-hidden /> Exportar os meus dados (JSON)
        </a>
        {!confirmDel ? (
          <Button variant="ghost" className="text-erro" onClick={() => setConfirmDel(true)}><Trash2 size={18} aria-hidden /> Apagar conta</Button>
        ) : (
          <div role="alertdialog" aria-label="Confirmar apagar conta" className="flex flex-col gap-3 rounded-m border border-erro p-4">
            <p className="font-semibold text-erro">Tens a certeza? A conta fica desativada já e é removida definitivamente dentro do prazo de retenção.</p>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setConfirmDel(false)}>Cancelar</Button>
              <Button variant="danger" onClick={async () => { const r = await deleteAccount(); if (r && !r.ok) toast(r.error, 'erro'); }}>Sim, apagar a minha conta</Button>
            </div>
          </div>
        )}
      </Card>
    </>
  );
}
