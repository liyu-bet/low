import type { WebsiteEventStats } from '@/lib/events/service';

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded border border-ink-700/60 bg-ink-950/40 px-3 py-3">
      <p className="text-xs uppercase tracking-wide text-ink-200">{label}</p>
      <p className="mt-1 font-display text-2xl text-sand-100">{value}</p>
    </div>
  );
}

export function WebsiteEventStatsCards({ stats }: { stats: WebsiteEventStats }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <Stat label="Всего событий" value={stats.total} />
      <Stat label="Ручных работ" value={stats.manualWork} />
      <Stat label="Технических" value={stats.technical} />
      <Stat label="SEO-событий" value={stats.seo} />
      <Stat label="За 30 дней" value={stats.last30Days} />
    </div>
  );
}
