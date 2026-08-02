import type { FunnelStep } from '@/lib/reports/types';

export function LifecycleFunnel({ steps }: { steps: FunnelStep[] }) {
  const max = Math.max(1, ...steps.map((s) => s.count));

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-2xl font-semibold text-sand-100">Воронка жизненного цикла</h2>
        <p className="mt-1 text-sm text-ink-200">
          Доля от предыдущего этапа и от всех сайтов в выборке.
        </p>
      </div>
      <div className="space-y-3">
        {steps.map((step) => (
          <div key={step.key} className="space-y-1">
            <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
              <span className="text-sand-100">{step.label}</span>
              <span className="text-ink-200">
                {step.count}
                {step.pctOfPrevious != null
                  ? ` — ${step.pctOfPrevious}% от предыдущего`
                  : ''}
                {` · ${step.pctOfTotal}% от всех`}
                {step.remaining > 0 ? ` · не дошли: ${step.remaining}` : ''}
              </span>
            </div>
            <div className="h-3 overflow-hidden rounded bg-ink-900">
              <div
                className="h-full rounded bg-moss-600/80"
                style={{ width: `${Math.max(2, (step.count / max) * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
