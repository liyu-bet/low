import Link from 'next/link';
import type { Website } from '@prisma/client';
import { shouldShowWebsiteName } from '@/lib/auth/actor-label';
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
  const showName = shouldShowWebsiteName(website);
  const meta = [
    labelWebsiteStatus(website.status),
    labelLifecycleStage(website.lifecycleStage),
    website.group?.trim() || 'Без группы',
  ].join(' · ');

  return (
    <section className="space-y-2">
      <Link href="/websites" className="text-sm text-ink-200 hover:text-ink-50">
        ← Сайты
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="break-all text-xl font-semibold text-ink-50 sm:text-2xl">
            {website.domain}
          </h1>
          {showName ? (
            <p className="mt-0.5 truncate text-sm text-ink-100">{website.name}</p>
          ) : null}
          <p className="mt-1 text-sm text-ink-200">{meta}</p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <a
            href={openUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded bg-moss-500 px-3 py-2 text-sm font-semibold text-white hover:bg-moss-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss-500"
          >
            Открыть сайт
          </a>
          {showSettings ? (
            <a
              href="#settings"
              aria-label="Настройки сайта"
              className="rounded border border-ink-700 px-2.5 py-2 text-sm text-ink-100 hover:border-moss-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss-500"
            >
              •••
            </a>
          ) : null}
        </div>
      </div>
    </section>
  );
}
