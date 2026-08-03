import Link from 'next/link';
import { APP_NAME } from '@/lib/constants';
import { APP_FULL_NAME_RU } from '@/lib/ui/labels';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getSessionCookieName, verifySessionToken } from '@/lib/auth/session';

export default async function HomePage() {
  const cookieStore = await cookies();
  const session = await verifySessionToken(cookieStore.get(getSessionCookieName())?.value);
  if (session) {
    redirect('/websites');
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-ink-950 px-4 py-12">
      <div className="w-full max-w-lg rounded-card border border-ink-700 bg-white p-6 shadow-card sm:p-8">
        <p className="text-3xl font-bold tracking-tight text-ink-50">{APP_NAME}</p>
        <h1 className="mt-2 text-xl font-semibold text-ink-50">{APP_FULL_NAME_RU}</h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-200">
          Личный журнал жизненного цикла сайтов. Отдельная база. Связи с DSD и GSC только через
          read-only API — без их секретов.
        </p>
        <div className="mt-6">
          <Link href="/login" className="btn-primary">
            Войти
          </Link>
        </div>
      </div>
    </main>
  );
}
