'use client';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Trash2 } from 'lucide-react';
import { Button, useToast } from '@/components/ui';
import { setPostStatus } from '@/server/actions/posts';

export function PostRowActions({ restaurantId, postId, status }: { restaurantId: string; postId: string; status: string }) {
  const router = useRouter();
  const { toast } = useToast();
  async function act(a: 'hide' | 'show' | 'delete') {
    if (a === 'delete' && !confirm('Apagar este prato? Esta ação não pode ser desfeita.')) return;
    const r = await setPostStatus(restaurantId, postId, a);
    if (!r.ok) return toast(r.error, 'erro');
    router.refresh();
  }
  return (
    <div className="flex gap-1">
      {status === 'hidden' ? <Button variant="ghost" size="sm" onClick={() => act('show')}><Eye size={16} aria-hidden /> Mostrar</Button> : status === 'published' ? <Button variant="ghost" size="sm" onClick={() => act('hide')}><EyeOff size={16} aria-hidden /> Esconder</Button> : null}
      <Button variant="ghost" size="sm" className="text-erro" onClick={() => act('delete')}><Trash2 size={16} aria-hidden /> Apagar</Button>
    </div>
  );
}
