/**
 * Timezone-aware scheduling helpers without Temporal.
 * Daily jobs use local calendar dates in WORKER_TIMEZONE (DST-safe via Intl).
 */

export type LocalParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  ymd: string;
};

export function getLocalParts(date: Date, timeZone: string): LocalParts {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(date).filter((p) => p.type !== 'literal').map((p) => [p.type, p.value]),
  ) as Record<string, string>;

  const year = Number(parts.year);
  const month = Number(parts.month);
  const day = Number(parts.day);
  const hour = Number(parts.hour);
  const minute = Number(parts.minute);
  const second = Number(parts.second);

  return {
    year,
    month,
    day,
    hour,
    minute,
    second,
    ymd: `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
  };
}

/** Binary-search UTC instant for local Y-M-D H:00:00 in timezone. */
export function zonedLocalHourToUtc(
  ymd: string,
  hour: number,
  timeZone: string,
): Date {
  const [y, m, d] = ymd.split('-').map(Number);
  // Rough guess: treat as UTC then adjust
  let guess = Date.UTC(y, m - 1, d, hour, 0, 0);
  for (let i = 0; i < 8; i += 1) {
    const local = getLocalParts(new Date(guess), timeZone);
    const targetMinutes = hour * 60;
    const actualMinutes = local.hour * 60 + local.minute;
    const dayDelta =
      Date.UTC(local.year, local.month - 1, local.day) - Date.UTC(y, m - 1, d);
    const dayMs = dayDelta;
    const minuteDelta = targetMinutes - actualMinutes;
    const adjust = dayMs + minuteDelta * 60_000 - local.second * 1000;
    if (adjust === 0) break;
    guess += adjust;
  }
  return new Date(guess);
}

export function addLocalDays(ymd: string, days: number): string {
  const [y, m, d] = ymd.split('-').map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d + days));
  return `${utc.getUTCFullYear()}-${String(utc.getUTCMonth() + 1).padStart(2, '0')}-${String(utc.getUTCDate()).padStart(2, '0')}`;
}

/**
 * Next run for an interval job.
 * Catch-up: if overdue, return `now` (at most one missed run — caller still runs once).
 */
export function nextIntervalRunAt(input: {
  lastFinishedAt: Date | null;
  intervalMs: number;
  now: Date;
}): Date {
  const intervalMs = Math.max(60_000, input.intervalMs);
  if (!input.lastFinishedAt) {
    return input.now;
  }
  const due = new Date(input.lastFinishedAt.getTime() + intervalMs);
  return due.getTime() <= input.now.getTime() ? input.now : due;
}

/**
 * Next daily local-hour run. At most once per local calendar day.
 * `lastLocalYmd` is the last day this job already ran (YYYY-MM-DD).
 */
export function nextDailyRunAt(input: {
  hour: number;
  timeZone: string;
  lastLocalYmd: string | null;
  now: Date;
}): Date {
  const hour = Math.min(23, Math.max(0, Math.floor(input.hour)));
  const local = getLocalParts(input.now, input.timeZone);
  let targetYmd = local.ymd;

  if (input.lastLocalYmd && input.lastLocalYmd >= local.ymd) {
    targetYmd = addLocalDays(input.lastLocalYmd, 1);
  } else if (local.hour > hour || (local.hour === hour && local.minute + local.second > 0)) {
    // Today's slot already passed without a recorded run — catch up once today if never run today
    if (input.lastLocalYmd === local.ymd) {
      targetYmd = addLocalDays(local.ymd, 1);
    } else {
      // Missed today's slot: run immediately (single catch-up)
      return input.now;
    }
  }

  if (targetYmd === local.ymd && local.hour < hour) {
    return zonedLocalHourToUtc(targetYmd, hour, input.timeZone);
  }
  if (targetYmd === local.ymd && local.hour === hour && local.minute === 0 && local.second === 0) {
    return input.now;
  }
  if (targetYmd > local.ymd) {
    return zonedLocalHourToUtc(targetYmd, hour, input.timeZone);
  }
  return zonedLocalHourToUtc(targetYmd, hour, input.timeZone);
}

/** True when local hour matches reconciliation hour and we have not reconciled this local day. */
export function shouldForceFullReconciliation(input: {
  hour: number;
  timeZone: string;
  lastFullLocalYmd: string | null;
  now: Date;
}): boolean {
  const local = getLocalParts(input.now, input.timeZone);
  if (local.hour !== Math.min(23, Math.max(0, Math.floor(input.hour)))) {
    return false;
  }
  return input.lastFullLocalYmd !== local.ymd;
}

export function computeBackoffMs(input: {
  consecutiveFailures: number;
  baseMs: number;
  maxMs: number;
}): number {
  const base = Math.max(1_000, input.baseMs);
  const max = Math.max(base, input.maxMs);
  const exp = Math.min(8, Math.max(0, input.consecutiveFailures - 1));
  return Math.min(max, base * 2 ** exp);
}
