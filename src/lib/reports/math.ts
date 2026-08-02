import { daysBetweenUtc } from '@/lib/dates/date-only';

/** Calendar-day difference (UTC date-only). Alias of daysBetweenUtc. */
export function differenceInCalendarDays(from: Date, to: Date): number {
  return daysBetweenUtc(from, to);
}

/** Median of a numeric list. Even length → average of two middle values. */
export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid]!;
  return (sorted[mid - 1]! + sorted[mid]!) / 2;
}

/**
 * Linear-interpolation percentile on a sorted (or unsorted) list.
 * `p` is 0–100. Empty → null.
 */
export function percentile(values: number[], p: number): number | null {
  if (values.length === 0) return null;
  if (p <= 0) return Math.min(...values);
  if (p >= 100) return Math.max(...values);
  const sorted = [...values].sort((a, b) => a - b);
  if (sorted.length === 1) return sorted[0]!;
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo]!;
  const weight = idx - lo;
  return sorted[lo]! + (sorted[hi]! - sorted[lo]!) * weight;
}

export type DurationSummary = {
  count: number;
  mean: number | null;
  median: number | null;
  min: number | null;
  max: number | null;
  p25: number | null;
  p75: number | null;
};

/** Summarize non-negative duration samples. Negatives/NaN are ignored by caller. */
export function summarizeDurations(days: number[]): DurationSummary {
  const clean = days.filter((d) => Number.isFinite(d) && d >= 0);
  if (clean.length === 0) {
    return {
      count: 0,
      mean: null,
      median: null,
      min: null,
      max: null,
      p25: null,
      p75: null,
    };
  }
  const sum = clean.reduce((acc, n) => acc + n, 0);
  return {
    count: clean.length,
    mean: sum / clean.length,
    median: median(clean),
    min: Math.min(...clean),
    max: Math.max(...clean),
    p25: percentile(clean, 25),
    p75: percentile(clean, 75),
  };
}

/** Round for display; keep nulls. */
export function roundDays(value: number | null, digits = 1): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  const f = 10 ** digits;
  return Math.round(value * f) / f;
}
