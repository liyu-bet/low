import Link from 'next/link';
import type { Website } from '@prisma/client';
import { shouldShowWebsiteName } from '@/lib/auth/actor-label';
import { PageHeader } from '@/components/ui/layout';
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

      <PageHeader
        title={website.domain}
        description={
          <>
            {showName ? <p className="truncate text-sm text-ink-100">{website.name}</p> : null}
            <p className={showName ? 'mt-0.5' : undefined}>{meta}</p>
          </>
        }
        actions={
          <>
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
          </>
        }
      />
    </section>
  );
}
