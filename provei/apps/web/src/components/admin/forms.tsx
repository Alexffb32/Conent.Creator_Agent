'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Button, Card, CardTitle, Checkbox, Field, Input, Select, Textarea, useToast } from '@/components/ui';
import { saveLoyaltyProgram, addOffer, removeOffer, inviteStaff, removeStaff, cancelInvite } from '@/server/actions/manage';
import { updateHours, updateRestaurant } from '@/server/actions/restaurant';
import { replyToReview } from '@/server/actions/reviews';
import { adjustLoyalty, ignoreUser } from '@/server/actions/table';

export function LoyaltyProgramForm({ restaurantId, free, program }: { restaurantId: string; free: boolean; program: { stamps_required: number; reward_text: string; points_per_visit: number; points_per_review_photo: number; points_first_visit: number; min_interval_hours: number; active: boolean } }) {
  const { toast } = useToast();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [active, setActive] = useState(program.active);
  return (
    <Card>
      <CardTitle className="mb-3">Programa de fidelização</CardTitle>
      <form
        className="grid gap-4 sm:grid-cols-2"
        onSubmit={async (e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          setBusy(true);
          const r = await saveLoyaltyProgram({ restaurantId, stampsRequired: fd.get('stamps'), rewardText: fd.get('reward'), pointsPerVisit: fd.get('ppv'), pointsPerReviewPhoto: fd.get('pprp'), pointsFirstVisit: fd.get('pfv'), minIntervalHours: fd.get('interval'), active });
          setBusy(false);
          if (!r.ok) return toast(r.error, 'erro');
          toast('Programa guardado');
          router.refresh();
        }}
      >
        <Field label="Carimbos para a recompensa" htmlFor="lp-s"><Input id="lp-s" name="stamps" type="number" min={2} max={50} defaultValue={program.stamps_required} /></Field>
        <Field label="Recompensa" htmlFor="lp-r"><Input id="lp-r" name="reward" defaultValue={program.reward_text} maxLength={120} /></Field>
        <Field label="Pontos por visita" htmlFor="lp-p" hint={free ? 'No plano gratuito é fixo (cartão de carimbos simples).' : undefined}><Input id="lp-p" name="ppv" type="number" min={0} defaultValue={program.points_per_visit} disabled={free} /></Field>
        <Field label="Pontos por avaliação com foto" htmlFor="lp-pr"><Input id="lp-pr" name="pprp" type="number" min={0} defaultValue={program.points_per_review_photo} disabled={free} /></Field>
        <Field label="Pontos na primeira visita" htmlFor="lp-pf"><Input id="lp-pf" name="pfv" type="number" min={0} defaultValue={program.points_first_visit} disabled={free} /></Field>
        <Field label="Intervalo mínimo entre visitas (horas)" htmlFor="lp-i"><Input id="lp-i" name="interval" type="number" min={0} max={168} defaultValue={program.min_interval_hours} /></Field>
        <div className="sm:col-span-2"><Checkbox checked={active} onChange={(e) => setActive(e.target.checked)} label="Programa ativo" /></div>
        <div className="sm:col-span-2"><Button type="submit" loading={busy}>Guardar</Button></div>
      </form>
    </Card>
  );
}

export function AdjustForm({ restaurantId }: { restaurantId: string }) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  return (
    <Card>
      <CardTitle className="mb-1 text-xl">Corrigir carimbos ou pontos</CardTitle>
      <p className="mb-3 text-sm text-tinta-2">Os registos são imutáveis: a correção cria um ajuste com razão e fica em auditoria.</p>
      <form
        className="grid gap-3 sm:grid-cols-4"
        onSubmit={async (e) => {
          e.preventDefault();
          const f = e.currentTarget;
          const fd = new FormData(f);
          setBusy(true);
          const handle = String(fd.get('handle') ?? '').replace(/^@/, '').trim().toLowerCase();
          const r = await adjustByHandle(restaurantId, handle, String(fd.get('kind')) as 'stamps' | 'points', Number(fd.get('delta')), String(fd.get('reason')));
          setBusy(false);
          if (!r.ok) return toast(r.error, 'erro');
          toast('Ajuste registado');
          f.reset();
        }}
      >
        <Field label="@utilizador" htmlFor="aj-h"><Input id="aj-h" name="handle" required /></Field>
        <Field label="O quê" htmlFor="aj-k"><Select id="aj-k" name="kind"><option value="points">Pontos</option><option value="stamps">Carimbos</option></Select></Field>
        <Field label="Variação (±)" htmlFor="aj-d"><Input id="aj-d" name="delta" type="number" required /></Field>
        <Field label="Razão" htmlFor="aj-r"><Input id="aj-r" name="reason" required minLength={3} /></Field>
        <div className="sm:col-span-4"><Button type="submit" variant="secondary" loading={busy}>Registar ajuste</Button></div>
      </form>
    </Card>
  );
}

async function adjustByHandle(restaurantId: string, handle: string, kind: 'stamps' | 'points', delta: number, reason: string) {
  const { adjustLoyaltyByHandle } = await import('@/server/actions/adjust');
  return adjustLoyaltyByHandle({ restaurantId, handle, kind, delta, reason });
}

export function ReviewReply({ reviewId }: { reviewId: string }) {
  const { toast } = useToast();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        setBusy(true);
        const r = await replyToReview({ reviewId, body: fd.get('body') });
        setBusy(false);
        if (!r.ok) return toast(r.error, 'erro');
        toast('Resposta publicada');
        router.refresh();
      }}
    >
      <label className="sr-only" htmlFor={`rr-${reviewId}`}>Resposta pública</label>
      <Textarea id={`rr-${reviewId}`} name="body" required minLength={2} maxLength={500} placeholder="Responder em público…" />
      <Button type="submit" size="sm" variant="secondary" loading={busy}>Responder</Button>
    </form>
  );
}

export function OfferForm({ restaurantId, allowed }: { restaurantId: string; allowed: boolean }) {
  const { toast } = useToast();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <Card>
      <CardTitle className="mb-3 text-xl">Nova oferta</CardTitle>
      {!allowed ? <p className="mb-3 rounded-m bg-amarelo-tinta p-3 text-sm">As ofertas fazem parte do plano pago.</p> : null}
      <form
        className="grid gap-3 sm:grid-cols-2"
        onSubmit={async (e) => {
          e.preventDefault();
          const f = e.currentTarget;
          const fd = new FormData(f);
          setBusy(true);
          const r = await addOffer({ restaurantId, title: fd.get('title'), description: fd.get('description'), endsAt: fd.get('endsAt') });
          setBusy(false);
          if (!r.ok) return toast(r.error, 'erro');
          toast('Oferta criada');
          f.reset();
          router.refresh();
        }}
      >
        <Field label="Título" htmlFor="of-t"><Input id="of-t" name="title" required minLength={2} maxLength={80} disabled={!allowed} /></Field>
        <Field label="Válida até" htmlFor="of-e"><Input id="of-e" name="endsAt" type="datetime-local" required disabled={!allowed} /></Field>
        <div className="sm:col-span-2"><Field label="Descrição" htmlFor="of-d"><Textarea id="of-d" name="description" maxLength={300} disabled={!allowed} /></Field></div>
        <div className="sm:col-span-2"><Button type="submit" loading={busy} disabled={!allowed}>Criar oferta</Button></div>
      </form>
    </Card>
  );
}

export function RemoveOfferButton({ restaurantId, offerId }: { restaurantId: string; offerId: string }) {
  const router = useRouter();
  return <Button variant="ghost" size="sm" className="text-erro" onClick={async () => { await removeOffer(restaurantId, offerId); router.refresh(); }}><Trash2 size={16} aria-hidden /> Remover</Button>;
}

export function InviteForm({ restaurantId }: { restaurantId: string }) {
  const { toast } = useToast();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="flex items-end gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        const f = e.currentTarget;
        const fd = new FormData(f);
        setBusy(true);
        const r = await inviteStaff({ restaurantId, email: fd.get('email') });
        setBusy(false);
        if (!r.ok) return toast(r.error, 'erro');
        toast(r.data.added ? 'Adicionado à equipa' : 'Convite enviado por e-mail', 'info');
        f.reset();
        router.refresh();
      }}
    >
      <div className="flex-1"><Field label="E-mail do novo membro" htmlFor="iv-e"><Input id="iv-e" name="email" type="email" required /></Field></div>
      <Button type="submit" loading={busy}>Convidar</Button>
    </form>
  );
}

export function RemoveStaffButton({ restaurantId, userId, invite }: { restaurantId: string; userId: string; invite?: boolean }) {
  const router = useRouter();
  return <Button variant="ghost" size="sm" className="text-erro" onClick={async () => { if (invite) await cancelInvite(restaurantId, userId); else await removeStaff(restaurantId, userId); router.refresh(); }}>{invite ? 'Cancelar convite' : 'Remover'}</Button>;
}

export function UnignoreButton({ restaurantId, userId }: { restaurantId: string; userId: string }) {
  const router = useRouter();
  return <Button variant="ghost" size="sm" onClick={async () => { await ignoreUser(restaurantId, userId, false); router.refresh(); }}>Deixar de ignorar</Button>;
}

const DAYS = [['seg', 'Segunda'], ['ter', 'Terça'], ['qua', 'Quarta'], ['qui', 'Quinta'], ['sex', 'Sexta'], ['sab', 'Sábado'], ['dom', 'Domingo']] as const;

export function SettingsForm({ restaurant }: { restaurant: { id: string; name: string; description: string | null; address: string | null; city: string | null; phone: string | null; website: string | null; cuisine: string[]; price_level: number | null; lat: number | null; lng: number | null; hours: Record<string, { open: string; close: string } | null> } }) {
  const { toast } = useToast();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [hours, setHours] = useState(restaurant.hours ?? {});
  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardTitle className="mb-3">Dados do restaurante</CardTitle>
        <form
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={async (e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            setBusy(true);
            const r = await updateRestaurant(restaurant.id, {
              name: fd.get('name'), description: fd.get('description'), address: fd.get('address'), city: fd.get('city'), phone: fd.get('phone'), website: fd.get('website'),
              cuisine: String(fd.get('cuisine') ?? '').split(',').map((s) => s.trim()).filter(Boolean),
              priceLevel: fd.get('price') || undefined, lat: fd.get('lat') || undefined, lng: fd.get('lng') || undefined,
            });
            setBusy(false);
            if (!r.ok) return toast(r.error, 'erro');
            toast('Dados guardados');
            router.refresh();
          }}
        >
          <Field label="Nome" htmlFor="st-n"><Input id="st-n" name="name" defaultValue={restaurant.name} required /></Field>
          <Field label="Cidade" htmlFor="st-c"><Input id="st-c" name="city" defaultValue={restaurant.city ?? ''} required /></Field>
          <div className="sm:col-span-2"><Field label="Descrição" htmlFor="st-d"><Textarea id="st-d" name="description" defaultValue={restaurant.description ?? ''} maxLength={1000} /></Field></div>
          <Field label="Morada" htmlFor="st-a"><Input id="st-a" name="address" defaultValue={restaurant.address ?? ''} /></Field>
          <Field label="Telefone" htmlFor="st-p"><Input id="st-p" name="phone" defaultValue={restaurant.phone ?? ''} inputMode="tel" /></Field>
          <Field label="Website" htmlFor="st-w"><Input id="st-w" name="website" type="url" defaultValue={restaurant.website ?? ''} /></Field>
          <Field label="Tipo de cozinha" htmlFor="st-k" hint="Separado por vírgulas"><Input id="st-k" name="cuisine" defaultValue={restaurant.cuisine.join(', ')} /></Field>
          <Field label="Preço (1 a 4)" htmlFor="st-pr"><Select id="st-pr" name="price" defaultValue={restaurant.price_level ?? ''}><option value="">—</option><option value="1">€</option><option value="2">€€</option><option value="3">€€€</option><option value="4">€€€€</option></Select></Field>
          <Field label="Latitude" htmlFor="st-la"><Input id="st-la" name="lat" inputMode="decimal" defaultValue={restaurant.lat ?? ''} /></Field>
          <Field label="Longitude" htmlFor="st-lo"><Input id="st-lo" name="lng" inputMode="decimal" defaultValue={restaurant.lng ?? ''} /></Field>
          <div className="sm:col-span-2"><Button type="submit" loading={busy}>Guardar</Button></div>
        </form>
      </Card>
      <Card>
        <CardTitle className="mb-3">Horário</CardTitle>
        <ul className="flex flex-col gap-2">
          {DAYS.map(([k, label]) => {
            const h = hours[k];
            return (
              <li key={k} className="grid grid-cols-[6rem_1fr] items-center gap-2 sm:grid-cols-[6rem_auto_auto_auto]">
                <span>{label}</span>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-5 w-5 accent-verde" checked={Boolean(h)} onChange={(e) => setHours({ ...hours, [k]: e.target.checked ? { open: '12:00', close: '23:00' } : null })} /> Aberto</label>
                {h ? <>
                  <Input aria-label={`${label} abre`} type="time" value={h.open} onChange={(e) => setHours({ ...hours, [k]: { ...h, open: e.target.value } })} className="max-w-[9rem]" />
                  <Input aria-label={`${label} fecha`} type="time" value={h.close} onChange={(e) => setHours({ ...hours, [k]: { ...h, close: e.target.value } })} className="max-w-[9rem]" />
                </> : null}
              </li>
            );
          })}
        </ul>
        <Button className="mt-3" variant="secondary" onClick={async () => { const r = await updateHours(restaurant.id, hours); toast(r.ok ? 'Horário guardado' : r.error, r.ok ? 'ok' : 'erro'); }}>Guardar horário</Button>
      </Card>
    </div>
  );
}

export { Checkbox, adjustLoyalty };
