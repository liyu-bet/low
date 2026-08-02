/**
 * Calendar date helpers without timezone day-shift.
 * Stored as Date at UTC midnight for the given Y-M-D.
 */

export class DateOnlyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DateOnlyError';
  }
}

const DATE_ONLY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parseDateOnly(input: string): Date {
  const trimmed = input.trim();
  const match = DATE_ONLY_RE.exec(trimmed);
  if (!match) {
    throw new DateOnlyError('Укажите корректную календарную дату');
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new DateOnlyError('Укажите корректную календарную дату');
  }

  return date;
}

export function toDateOnlyUtc(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function todayDateOnlyUtc(now: Date = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Whole calendar days from `from` to `to` (UTC date-only). */
export function daysBetweenUtc(from: Date, to: Date): number {
  return Math.floor((toDateOnlyUtc(to).getTime() - toDateOnlyUtc(from).getTime()) / DAY_MS);
}

export function assertNotFutureDateOnly(date: Date, now: Date = new Date()): void {
  if (toDateOnlyUtc(date).getTime() > todayDateOnlyUtc(now).getTime()) {
    throw new DateOnlyError('Дата не может быть позже сегодняшнего дня');
  }
}

export function dateOnlyToInputValue(date: Date | null | undefined): string {
  if (!date) return '';
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Russian long date from UTC calendar components: «31 июля 2026 г.» */
export function formatDateOnlyRu(value: Date | null | undefined): string {
  if (!value) return '—';
  return value.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}
