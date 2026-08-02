import { APP_NAME } from '@/lib/constants';
import { LoginForm } from '@/components/LoginForm';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  const nextPath =
    params.next && params.next.startsWith('/') && !params.next.startsWith('//')
      ? params.next
      : '/websites';

  return (
    <main className="relative flex min-h-screen items-center justify-center px-6 py-16">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_rgba(111,155,122,0.22),_transparent_55%),linear-gradient(160deg,#0a100e_0%,#121a17_55%,#1a2621_100%)]"
      />
      <div className="relative w-full max-w-md rounded-lg border border-ink-700/70 bg-ink-950/70 p-8 shadow-xl backdrop-blur">
        <p className="font-display text-4xl text-sand-100">{APP_NAME}</p>
        <h1 className="mt-2 text-lg text-ink-100">Вход администратора</h1>
        <p className="mt-1 mb-6 text-sm text-ink-200">Доступ одного администратора.</p>
        <LoginForm nextPath={nextPath} />
      </div>
    </main>
  );
}
