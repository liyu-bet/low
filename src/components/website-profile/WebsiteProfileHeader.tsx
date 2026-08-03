import Link from 'next/link';
import type { Website } from '@prisma/client';
import { labelLifecycleStage, labelWebsiteStatus } from '@/lib/ui/labels';

export function WebsiteProfileHeader({
  website,
  openUrl,
  showSettings = true,
}: {
  website: Website;
  openUrl: string;
  showSettings?: boolean;
}) {
  return (
    <section className="space-y-3">
      <Link href="/websites" className="text-sm text-ink-200 hover:text-ink-50">
        ← Сайты
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold text-ink-50 sm:text-3xl">{website.domain}</h1>
          </div>
          {website.name ? <p className="mt-1 text-base text-ink-100">{website.name}</p> : null}
          <div className="mt-2 flex flex-wrap gap-2 text-xs text-ink-200">
            {website.group ? (
              <span className="rounded border border-ink-700 px-2 py-1">{website.group}</span>
            ) : null}
            <span className="rounded border border-ink-700 px-2 py-1 text-ink-100">
              {labelWebsiteStatus(website.status)}
            </span>
            <span className="rounded border border-ink-700 px-2 py-1 font-medium text-ink-50">
              {labelLifecycleStage(website.lifecycleStage)}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <a
            href={openUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded bg-moss-500 px-3 py-2 text-sm font-semibold text-white hover:bg-moss-600"
          >
            Открыть сайт
          </a>
          {showSettings ? (
            <a
              href="#settings"
              className="rounded border border-ink-700 px-3 py-2 text-sm text-ink-100 hover:border-moss-500"
            >
              Настройки
            </a>
          ) : null}
        </div>
      </div>
    </section>
  );
}
