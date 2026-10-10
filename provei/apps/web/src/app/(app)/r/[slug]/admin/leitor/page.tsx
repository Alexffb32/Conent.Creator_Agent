import type { Metadata } from 'next';
import { StaffScanner } from '@/components/admin/StaffScanner';
import { requireMemberPage } from '@/server/auth';

export const metadata: Metadata = { title: 'Leitor de QR' };
export const dynamic = 'force-dynamic';

export default async function LeitorPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ctx = await requireMemberPage(slug);
  return <StaffScanner restaurantId={ctx.restaurant.id} />;
}
