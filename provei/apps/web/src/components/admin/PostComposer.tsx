'use client';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { ALLOWED_PHOTO_MIME, ALLOWED_VIDEO_MIME, MAX_PHOTO_BYTES, MAX_VIDEO_BYTES, MAX_VIDEO_MS } from '@provei/api-client';
import { Button, Card, CardTitle, Field, Input, Textarea, useToast } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';
import { createPost, finalizeUpload, requestUpload } from '@/server/actions/posts';

function videoDurationMs(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const v = document.createElement('video');
    v.preload = 'metadata';
    v.onloadedmetadata = () => {
      URL.revokeObjectURL(v.src);
      resolve(Math.round(v.duration * 1000));
    };
    v.onerror = () => reject(new Error('Não conseguimos ler o vídeo.'));
    v.src = URL.createObjectURL(file);
  });
}

export function PostComposer({ restaurantId }: { restaurantId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [step, setStep] = useState<'idle' | 'uploading' | 'processing' | 'saving'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    setError(null);
    if (!file) return setError('Escolhe uma foto ou um vídeo.');
    const isVideo = file.type.startsWith('video/');
    if (!(isVideo ? (ALLOWED_VIDEO_MIME as readonly string[]) : (ALLOWED_PHOTO_MIME as readonly string[])).includes(file.type)) return setError('Formato não suportado. Usa mp4/mov ou jpg/png/webp.');
    if (file.size > (isVideo ? MAX_VIDEO_BYTES : MAX_PHOTO_BYTES)) return setError(isVideo ? 'O vídeo pode ter no máximo 100 MB.' : 'A foto pode ter no máximo 10 MB.');
    try {
      setStep('uploading');
      const durationMs = isVideo ? await videoDurationMs(file) : undefined;
      if (durationMs && durationMs > MAX_VIDEO_MS) throw new Error('O vídeo pode ter no máximo 30 segundos.');
      const req = await requestUpload({ restaurantId, kind: isVideo ? 'video' : 'photo', mime: file.type, sizeBytes: file.size, durationMs });
      if (!req.ok) throw new Error(req.error);
      const sb = createClient();
      const up = await sb.storage.from('media').uploadToSignedUrl(req.data.path, req.data.token, file, { contentType: file.type });
      if (up.error) throw new Error('Falhou o envio do ficheiro. Verifica a ligação e tenta outra vez.');
      setStep('processing');
      const fin = await finalizeUpload(restaurantId, req.data.mediaId);
      if (!fin.ok) throw new Error(fin.error);
      setStep('saving');
      const tags = String(fd.get('tags') ?? '').split(',').map((t) => t.trim()).filter(Boolean);
      const price = String(fd.get('price') ?? '').replace(',', '.');
      const post = await createPost({ restaurantId, mediaId: req.data.mediaId, dishName: fd.get('dish'), caption: fd.get('caption'), priceEuros: price ? Number(price) : undefined, tags });
      if (!post.ok) throw new Error(post.error);
      toast(post.data.status === 'published' ? 'Prato publicado!' : 'Prato guardado. Aparece no feed quando o vídeo estiver pronto.');
      form.reset();
      setFile(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Algo correu mal.');
    } finally {
      setStep('idle');
    }
  }
  const busy = step !== 'idle';
  return (
    <Card>
      <CardTitle className="mb-3">Publicar um prato</CardTitle>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div>
          <input ref={fileRef} id="pc-file" type="file" accept="video/mp4,video/quicktime,image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          <Button type="button" variant="secondary" onClick={() => fileRef.current?.click()}><Upload size={18} aria-hidden /> {file ? file.name : 'Escolher foto ou vídeo (até 30 s)'}</Button>
        </div>
        <Field label="Nome do prato" htmlFor="pc-dish"><Input id="pc-dish" name="dish" required minLength={2} maxLength={100} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Preço (€)" htmlFor="pc-price"><Input id="pc-price" name="price" inputMode="decimal" placeholder="12,50" /></Field>
          <Field label="Etiquetas" htmlFor="pc-tags" hint="Separadas por vírgulas"><Input id="pc-tags" name="tags" placeholder="peixe, tradicional" /></Field>
        </div>
        <Field label="Legenda" htmlFor="pc-caption"><Textarea id="pc-caption" name="caption" maxLength={500} /></Field>
        {error ? <p role="alert" className="text-erro">{error}</p> : null}
        <Button type="submit" loading={busy}>{step === 'uploading' ? 'A enviar…' : step === 'processing' ? 'A processar…' : step === 'saving' ? 'A publicar…' : 'Publicar'}</Button>
      </form>
    </Card>
  );
}
