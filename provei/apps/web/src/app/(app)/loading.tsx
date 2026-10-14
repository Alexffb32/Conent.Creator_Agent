import { Skeleton } from '@/components/ui';
export default function Loading() {
  return (
    <div className="pv-container flex flex-col gap-4 pt-6" aria-busy aria-label="A carregar">
      <Skeleton className="h-10 w-2/3" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
