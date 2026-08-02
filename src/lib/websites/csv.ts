/** Escape a CSV cell for Excel-friendly UTF-8 CSV. */
export function escapeCsvCell(value: string | number | null | undefined): string {
  const raw = value == null ? '' : String(value);
  if (/[",\r\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

export function buildCsv(rows: string[][]): string {
  return rows.map((row) => row.map(escapeCsvCell).join(',')).join('\r\n');
}

/** UTF-8 BOM + CSV body for Excel. */
export function buildCsvWithBom(rows: string[][]): string {
  return `\uFEFF${buildCsv(rows)}`;
}

export function csvFilenameForDate(now: Date = new Date()): string {
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  const d = String(now.getUTCDate()).padStart(2, '0');
  return `low-websites-${y}-${m}-${d}.csv`;
}
