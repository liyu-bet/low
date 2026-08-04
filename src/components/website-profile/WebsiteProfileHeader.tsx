import Link from 'next/link';
import type { Website } from '@prisma/client';
import { shouldShowWebsiteName } from '@/lib/auth/actor-label';
import { WebsiteFavoriteStar } from '@/components/websites/WebsiteFavoriteStar';
import { labelLifecycleStage, labelWebsiteStatus } from '@/lib/ui/labels';

export function WebsiteProfileHeader({
  website,
  openUrl,
  showSettings = true,
  isFavorite = false,
}: {
  website: Website;
  openUrl: string;
  showSettings?: boolean;
  isFavorite?: boolean;
}) {
  const showName = shouldShowWebsiteName(website);
  const archived = Boolean(website.archivedAt || website.status === 'ARCHIVED');
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

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <WebsiteFavoriteStar
              websiteId={website.id}
              isFavorite={isFavorite}
              disabled={archived && !isFavorite}
            />
            <h1 className="break-anywhere text-xl font-semibold text-ink-50 sm:text-2xl">
              {website.domain}
            </h1>
          </div>
          <div className="mt-1 text-sm text-ink-200">
            {showName ? <p className="truncate text-sm text-ink-100">{website.name}</p> : null}
            <p className={showName ? 'mt-0.5' : undefined}>{meta}</p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <a
            href={openUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary"
          >
            Открыть сайт
          </a>
          {showSettings ? (
            <a href="#settings" className="icon-btn" aria-label="Настройки сайта">
              •••
            </a>
          ) : null}
        </div>
      </div>
    </section>
  );
}
