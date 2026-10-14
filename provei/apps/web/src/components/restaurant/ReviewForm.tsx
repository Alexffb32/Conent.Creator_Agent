'use client';
import { useState } from 'react';
import { Button, Card, CardTitle, Field, RatingInput, Textarea, useToast } from '@/components/ui';
import { submitPrivateFeedback, submitReview } from '@/server/actions/reviews';

export function ReviewForm({ restaurantId }: { restaurantId: string }) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fbBusy, setFbBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    const r = await submitReview({ restaurantId, rating: Number(fd.get('rating')), text: String(fd.get('text') ?? '') });
    setBusy(false);
    if (!r.ok) return setError(r.error);
    toast(r.data.verified ? 'Avaliação publicada com selo de visita verificada.' : 'Avaliação publicada. Obrigado!');
    (e.target as HTMLFormElement).reset();
    location.reload();
  }
  async function onFeedback(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setFbBusy(true);
    const r = await submitPrivateFeedback({ restaurantId, message: String(fd.get('message') ?? '') });
    setFbBusy(false);
    if (!r.ok) return toast(r.error, 'erro');
    toast('Mensagem enviada em privado ao restaurante.');
    (e.target as HTMLFormElement).reset();
  }
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardTitle className="mb-3 text-xl">Deixa a tua avaliação</CardTitle>
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <RatingInput name="rating" />
          <Field label="Comentário (opcional)" htmlFor="rv-text" error={error}>
            <Textarea id="rv-text" name="text" maxLength={1000} placeholder="O que provaste? Como foi o serviço?" />
          </Field>
          <Button type="submit" loading={busy}>Publicar avaliação</Button>
        </form>
      </Card>
      <Card>
        <CardTitle className="mb-1 text-xl">Mensagem privada</CardTitle>
        <p className="mb-3 text-sm text-tinta-2">Só o restaurante lê. Ideal para queixas e sugestões.</p>
        <form onSubmit={onFeedback} className="flex flex-col gap-3">
          <Field label="Mensagem" htmlFor="fb-msg"><Textarea id="fb-msg" name="message" required minLength={2} maxLength={1000} /></Field>
          <Button type="submit" variant="secondary" loading={fbBusy}>Enviar em privado</Button>
        </form>
      </Card>
    </div>
  );
}
