/**
 * Logótipo provisório. PONTO ÚNICO DE SUBSTITUIÇÃO: trocar o conteúdo deste componente
 * pelo kit oficial (SVG) quando existir. O resto da app só importa <Logo />.
 */
export function Logo({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <span className={className} style={{ display: 'inline-flex', alignItems: 'baseline', gap: 2, lineHeight: 1 }} aria-label="Provei" role="img">
      <svg width={size * 3.6} height={size * 1.15} viewBox="0 0 120 38" aria-hidden focusable="false">
        <text x="0" y="29" fontFamily="var(--font-serif), Georgia, serif" fontSize="34" fill="#0A3D1C">
          Provei
        </text>
        <circle cx="113" cy="27" r="4.2" fill="#7BC62D" />
      </svg>
    </span>
  );
}
