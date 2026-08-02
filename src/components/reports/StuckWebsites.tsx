import Link from 'next/link';
import type { StuckCategory } from '@/lib/reports/types';

export function StuckWebsites({ categories }: { categories: StuckCategory[] }) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold text-sand-100">Застряли на этапе</h2>
        <p className="mt-1 text-sm text-ink-200">
          Пороги как в логике внимания на обзоре, где применимо. Без отдельных записей в БД.
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {categories.map((cat) => (
          <div
            key={cat.key}
            className="rounded border border-ink-700 bg-white p-4"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-sand-100">{cat.label}</h3>
              <span className="text-sm text-ink-200">{cat.count}</span>
            </div>
            {cat.sites.length === 0 ? (
              <p className="mt-2 text-sm text-ink-300">Нет сайтов</p>
            ) : (
              <ul className="mt-3 space-y-1.5 text-sm">
                {cat.sites.map((site) => (
                  <li key={site.websiteId} className="flex flex-wrap justify-between gap-2">
                    <Link href={site.href} className="text-moss-600 hover:text-moss-200">
                      {site.domain}
                    </Link>
                    <span className="text-ink-300">
                      {site.group ? `${site.group} · ` : ''}
                      {site.days} дн.
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <Link
              href={cat.showAllHref}
              className="mt-3 inline-block text-sm text-ink-200 hover:text-sand-100"
            >
              Показать все →
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}
