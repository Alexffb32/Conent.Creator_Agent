import { ImageResponse } from 'next/og';

export const alt = 'Provei: o que está a sair da cozinha, na Covilhã e no Fundão';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OgImage() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 80, background: '#0A3D1C', color: '#FFFFFF' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', fontSize: 110, fontWeight: 700, letterSpacing: -2 }}>
          Provei
          <div style={{ width: 28, height: 28, borderRadius: 14, background: '#7BC62D', marginLeft: 10, marginBottom: 26 }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ fontSize: 60, lineHeight: 1.1, maxWidth: 950 }}>O que está a sair da cozinha, perto de ti.</div>
          <div style={{ fontSize: 32, color: '#F4C430' }}>Covilhã · Fundão</div>
        </div>
      </div>
    ),
    size,
  );
}
