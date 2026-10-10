'use client';
import { useState, useTransition } from 'react';
import { Heart } from 'lucide-react';
import { Button, useToast } from '@/components/ui';
import { toggleFollow } from '@/server/actions/social';

export function FollowButton({ restaurantId, initial, loggedIn, count }: { restaurantId: string; initial: boolean; loggedIn: boolean; count: number }) {
  const { toast } = useToast();
  const [following, setFollowing] = useState(initial);
  const [n, setN] = useState(count);
  const [pending, start] = useTransition();
  return (
    <Button
      variant={following ? 'secondary' : 'primary'}
      aria-pressed={following}
      loading={pending}
      onClick={() => {
        if (!loggedIn) {
          location.href = `/entrar?next=${encodeURIComponent(location.pathname)}`;
          return;
        }
        start(async () => {
          const r = await toggleFollow(restaurantId);
          if (!r.ok) return toast(r.error, 'erro');
          setFollowing(r.data.following);
          setN((c) => Math.max(0, c + (r.data.following ? 1 : -1)));
        });
      }}
    >
      <Heart size={18} aria-hidden className={following ? 'fill-verde' : ''} /> {following ? 'A seguir' : 'Seguir'} · {n}
    </Button>
  );
}
