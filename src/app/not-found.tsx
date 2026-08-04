import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center px-4 py-16 text-center">
      <h1 className="text-xl font-semibold text-ink-50">Страница не найдена</h1>
      <p className="mt-2 text-sm text-ink-200">Проверьте адрес или вернитесь к сайтам.</p>
      <Link href="/websites" className="btn-primary mt-6">
        Вернуться к сайтам
      </Link>
    </main>
  );
}
