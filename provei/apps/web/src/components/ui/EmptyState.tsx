import type { ReactNode } from 'react';

export function EmptyState({ title, description, action, icon }: { title: string; description?: string; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-l border border-linha bg-branco px-6 py-12 text-center shadow-sm">
      {icon ? <div className="text-verde" aria-hidden>{icon}</div> : null}
      <h2 className="pv-title text-2xl text-verde-escuro">{title}</h2>
      {description ? <p className="max-w-sm text-tinta-2">{description}</p> : null}
      {action}
    </div>
  );
}
