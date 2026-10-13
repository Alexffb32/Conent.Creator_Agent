import type { ReactNode } from 'react';
import { getT } from '@/i18n/server';

/** Moldura comum das páginas legais: aviso de revisão, data e nota em EN. */
export async function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  const { locale } = await getT();
  return (
    <article className="pv-container max-w-prose py-8">
      <p role="note" className="mb-6 rounded-m border border-amarelo bg-amarelo-tinta p-3 text-sm font-semibold">
        Versão de trabalho, a rever por jurista antes do lançamento público. Os pontos marcados [VERIFY] estão por confirmar.
      </p>
      {locale === 'en' ? (
        <p lang="en" className="mb-6 rounded-m bg-nevoa p-3 text-sm">
          This legal text is available in Portuguese only for now. The Portuguese version prevails. Questions: ola@provei.pt.
        </p>
      ) : null}
      <h1 className="pv-title mb-2 text-4xl text-verde-escuro">{title}</h1>
      <p className="mb-6 text-sm text-tinta-2">Última atualização: {updated}</p>
      <div className="pv-legal flex flex-col gap-4 text-tinta">{children}</div>
    </article>
  );
}

export const ENTITY = {
  name: 'Alexandre Bento',
  form: 'empresário em nome individual',
  nif: '[MISSING: NIF]',
  address: '[MISSING: morada profissional]',
  email: 'ola@provei.pt',
};
