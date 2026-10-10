import { WifiOff } from 'lucide-react';
import { EmptyState } from '@/components/ui';

export const metadata = { title: 'Sem ligação' };

export default function OfflinePage() {
  return (
    <div className="pv-container pt-10">
      <EmptyState icon={<WifiOff size={40} />} title="Estás sem ligação" description="Não conseguimos carregar esta página. Se estás num restaurante, o serviço continua normal: chama a equipa com um aceno." />
    </div>
  );
}
