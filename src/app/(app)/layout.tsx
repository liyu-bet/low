import { requireUserSession } from '@/app/login/actions';
import { AppHeader } from '@/components/AppHeader';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireUserSession();

  return (
    <div className="min-h-screen bg-ink-950">
      <AppHeader
        user={{
          userId: session.userId,
          email: session.email,
          name: session.name,
          role: session.role,
        }}
      />
      <main className="mx-auto max-w-app px-4 py-5 sm:px-6 sm:py-6 lg:px-7 lg:py-8">{children}</main>
    </div>
  );
}
