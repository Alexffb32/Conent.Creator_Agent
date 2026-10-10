/** Gráfico de barras simples em SVG, acessível (tabela alternativa para leitores de ecrã). */
export function BarChart({ data, label, color = '#2D7F1A' }: { data: { label: string; value: number }[]; label: string; color?: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const w = 100 / Math.max(1, data.length);
  return (
    <figure className="flex flex-col gap-1">
      <svg viewBox="0 0 100 40" role="img" aria-label={label} preserveAspectRatio="none" className="h-28 w-full rounded-m bg-nevoa">
        {data.map((d, i) => {
          const h = (d.value / max) * 36;
          return <rect key={i} x={i * w + w * 0.12} y={38 - h} width={w * 0.76} height={Math.max(h, d.value > 0 ? 0.8 : 0.2)} rx="0.6" fill={color} />;
        })}
      </svg>
      <figcaption className="flex justify-between text-xs text-tinta-2"><span>{data[0]?.label}</span><span>{data.at(-1)?.label}</span></figcaption>
      <table className="sr-only"><caption>{label}</caption><tbody>{data.map((d) => <tr key={d.label}><th scope="row">{d.label}</th><td>{d.value}</td></tr>)}</tbody></table>
    </figure>
  );
}
