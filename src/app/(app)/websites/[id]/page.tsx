import { notFound } from 'next/navigation';
import { createManualEventAction } from '@/app/(app)/websites/[id]/events/actions';
import { EventForm } from '@/components/EventForm';
import { EventTimeline } from '@/components/EventTimeline';
import { WebsiteDsdBlock } from '@/components/WebsiteDsdBlock';
import { WebsiteGscBlock } from '@/components/WebsiteGscBlock';
import { WebsiteTasksBlock } from '@/components/tasks/WebsiteTasksBlock';
import { WebsiteAttentionBlock } from '@/components/website-profile/WebsiteAttentionBlock';
import { WebsiteEventFilters } from '@/components/website-profile/WebsiteEventFilters';
import { WebsiteEventStatsCards } from '@/components/website-profile/WebsiteEventStats';
import { WebsiteLifecycle } from '@/components/website-profile/WebsiteLifecycle';
import { WebsiteProfileHeader } from '@/components/website-profile/WebsiteProfileHeader';
import { WebsiteSettingsBlock } from '@/components/website-profile/WebsiteSettingsBlock';
import { WebsiteStatusOverview } from '@/components/website-profile/WebsiteStatusOverview';
import {
  getWebsiteProfile,
  isWebsiteProfileNotFoundError,
} from '@/lib/websites/profile';

export default async function WebsiteDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const query = await searchParams;

  let profile;
  try {
    profile = await getWebsiteProfile(id, query);
  } catch (error) {
    if (isWebsiteProfileNotFoundError(error)) notFound();
    throw error;
  }

  const { website } = profile;
  const createEvent = createManualEventAction.bind(null, website.id);

  return (
    <div className="space-y-8 lg:space-y-10">
      <WebsiteProfileHeader website={website} openUrl={profile.overview.openUrl} />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-8 min-w-0">
          <WebsiteStatusOverview website={website} overview={profile.overview} />
          <WebsiteLifecycle website={website} intervals={profile.intervals} />

          <section id="integrations" className="space-y-6">
            <WebsiteDsdBlock integration={profile.dsdIntegration} />
            <WebsiteGscBlock
              integrations={profile.gscIntegrations}
              gscFirstSeenAt={website.gscFirstSeenAt}
              firstImpressionAt={website.firstImpressionAt}
              firstClickAt={website.firstClickAt}
            />
          </section>

          <section id="history" className="space-y-4">
            <div>
              <h2 className="font-display text-2xl text-sand-100">Журнал событий</h2>
              <p className="mt-1 text-sm text-ink-200">
                Хронология по дате события. Источник каждой записи виден в ленте.
              </p>
            </div>
            <WebsiteEventStatsCards stats={profile.eventStats} />
            <WebsiteEventFilters
              websiteId={website.id}
              query={profile.eventsQuery}
              total={profile.eventsTotal}
              pageSize={profile.eventsPageSize}
            />
            <EventTimeline events={profile.events} />
          </section>

          <section id="add-event">
            <EventForm action={createEvent} />
          </section>

          <WebsiteSettingsBlock website={website} />
        </div>

        <aside className="space-y-6 lg:sticky lg:top-6 lg:self-start">
          <WebsiteAttentionBlock attention={profile.attention} websiteId={website.id} />
          <WebsiteTasksBlock
            websiteId={website.id}
            domain={website.domain}
            name={website.name}
            group={website.group}
            archived={Boolean(website.archivedAt || website.status === 'ARCHIVED')}
            data={profile.tasks}
          />
        </aside>
      </div>
    </div>
  );
}
