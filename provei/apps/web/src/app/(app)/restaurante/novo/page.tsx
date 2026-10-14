import type { Metadata } from 'next';
import { requireUser } from '@/server/auth';
import { NewRestaurantForm } from './NewRestaurantForm';

export const metadata: Metadata = { title: 'Criar restaurante' };

export default async function NovoRestaurantePage() {
  await requireUser('/restaurante/novo');
  return (
    <div className="pv-container max-w-xl pt-5">
      <h1 className="pv-title mb-2 text-4xl text-verde-escuro">Criar o teu restaurante</h1>
      <p className="mb-5 text-tinta-2">Depois de criares, a nossa equipa verifica o restaurante. Até lá só tu o vês.</p>
      <NewRestaurantForm />
    </div>
  );
}
