import { redirect } from 'next/navigation';
import { verifySessionToken, getSessionCookieName } from '@/lib/auth/session';
import { cookies } from 'next/headers';
import { APP_NAME } from '@/lib/constants';
import { APP_FULL_NAME_RU } from '@/lib/ui/labels';
import Link from 'next/link';

export default async function HomePage() {
  const cookieStore = await cookies();
  const session = await verifySessionToken(cookieStore.get(getSessionCookieName())?.value);
  if (session) {
    redirect('/dashboard');
  }

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_rgba(111,155,122,0.22),_transparent_55%),radial-gradient(ellipse_at_bottom_right,_rgba(226,213,194,0.12),_transparent_50%),linear-gradient(160deg,#0a100e_0%,#121a17_45%,#1a2621_100%)]"
      />
      <div className="relative mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6 py-16">
        <p className="font-display text-5xl tracking-tight text-sand-100 sm:text-6xl">{APP_NAME}</p>
        <h1 className="mt-3 max-w-xl font-display text-2xl font-medium text-ink-100 sm:text-3xl">
          {APP_FULL_NAME_RU}
        </h1>
        <p className="mt-5 max-w-lg text-base leading-relaxed text-ink-200">
          Личный журнал жизненного цикла сайтов. Отдельная база. Связи с DSD и GSC только через
          read-only API — без их секретов.
        </p>
        <div className="mt-10">
          <Link
            href="/login"
            className="inline-flex rounded bg-moss-500 px-4 py-2.5 text-sm font-semibold text-ink-950 hover:bg-moss-400"
          >
            Войти как администратор
          </Link>
        </div>
      </div>
    </main>
  );
}
