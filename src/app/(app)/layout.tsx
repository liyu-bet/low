import { requireAdminSession } from '@/app/login/actions';
import { AppHeader } from '@/components/AppHeader';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdminSession();

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_rgba(111,155,122,0.12),_transparent_50%),linear-gradient(180deg,#0a100e_0%,#121a17_100%)]">
      <AppHeader email={session.email} />
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
