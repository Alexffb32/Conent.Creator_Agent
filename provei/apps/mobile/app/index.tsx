import { useEffect, useState } from 'react';
import { FlatList, Pressable, Text, TextInput, View } from 'react-native';
import { MSG, feedScore } from '@provei/domain';
import { supabase } from '../src/supabase';

interface Row { id: string; dish_name: string; price_cents: number | null; published_at: string; save_count: number; view_count: number; restaurants: { name: string; city: string | null } }

export default function Feed() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(Boolean(data.session)));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSignedIn(Boolean(s)));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    supabase
      .from('posts')
      .select('id, dish_name, price_cents, published_at, save_count, view_count, restaurants!inner(name, city)')
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(50)
      .then(({ data }) => {
        const now = new Date();
        const list = ((data ?? []) as unknown as Row[]).map((r) => ({ r, s: feedScore({ publishedAt: new Date(r.published_at), followed: false, distanceKm: null, saves: r.save_count, views: r.view_count, now }) }));
        setRows(list.sort((a, b) => b.s - a.s).map((x) => x.r));
      });
  }, []);

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 28, color: '#0A3D1C', marginBottom: 12 }}>{MSG.feedHello}</Text>
      {!signedIn ? (
        <View style={{ marginBottom: 12 }}>
          <TextInput value={email} onChangeText={setEmail} placeholder="o.teu@email.pt" autoCapitalize="none" keyboardType="email-address" style={{ backgroundColor: '#fff', borderRadius: 16, padding: 14 }} />
          <Pressable onPress={async () => { await supabase.auth.signInWithOtp({ email }); setSent(true); }} style={{ backgroundColor: '#2D7F1A', borderRadius: 999, padding: 14, marginTop: 8 }}>
            <Text style={{ color: '#fff', textAlign: 'center', fontWeight: '600' }}>{sent ? 'Link enviado' : 'Entrar com link por e-mail'}</Text>
          </Pressable>
        </View>
      ) : null}
      <FlatList
        data={rows}
        keyExtractor={(r) => r.id}
        ListEmptyComponent={<Text>{MSG.feedEmpty}</Text>}
        renderItem={({ item }) => (
          <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#DDE8D5' }}>
            <Text style={{ fontSize: 20, color: '#0A3D1C' }}>{item.dish_name}</Text>
            <Text style={{ color: '#4A5D4F' }}>{item.restaurants.name}{item.restaurants.city ? ` · ${item.restaurants.city}` : ''}</Text>
          </View>
        )}
      />
    </View>
  );
}
