import { requireUserSession } from '@/app/login/actions';
import { APP_NAME } from '@/lib/constants';
import Link from 'next/link';

export default async function PasswordGateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireUserSession({ allowMustChangePassword: true });

  return (
    <div className="min-h-screen bg-ink-950">
      <header className="border-b border-ink-700 bg-white">
        <div className="mx-auto flex h-14 max-w-app items-center px-4 sm:px-6 lg:px-8">
          <Link href="/account/password" className="text-lg font-bold text-ink-50">
            {APP_NAME}
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-lg px-4 py-8">{children}</main>
    </div>
  );
}
