export function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="flex items-center gap-2" aria-label="Progresso">
      {steps.map((s, i) => (
        <li key={s} className="flex flex-1 flex-col gap-1" aria-current={i === current ? 'step' : undefined}>
          <span className={`h-1.5 rounded-pill ${i <= current ? 'bg-verde' : 'bg-linha'}`} />
          <span className={`text-xs ${i === current ? 'font-semibold text-verde-escuro' : 'text-tinta-2'}`}>{s}</span>
        </li>
      ))}
    </ol>
  );
}
