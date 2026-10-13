/**
 * Logótipo provisório. PONTO ÚNICO DE SUBSTITUIÇÃO: trocar o conteúdo deste componente
 * pelo kit oficial (SVG) quando existir. O resto da app só importa <Logo />.
 */
export function Logo({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <span className={className} role="img" aria-label="Provei" style={{ display: 'inline-flex', alignItems: 'baseline', lineHeight: 1 }}>
      <span aria-hidden className="pv-title text-verde-escuro" style={{ fontSize: size * 1.15, letterSpacing: '-0.01em' }}>
        Provei
      </span>
      <span aria-hidden style={{ width: size * 0.26, height: size * 0.26, borderRadius: 999, background: '#7BC62D', marginLeft: size * 0.06, display: 'inline-block' }} />
    </span>
  );
}
