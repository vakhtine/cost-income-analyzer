function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function normalizeYear(value: number) {
  if (value >= 100) return value;
  return value >= 70 ? 1900 + value : 2000 + value;
}

export function periodKeyFromParts(year: number, month: number) {
  return `${year}-${pad2(month)}`;
}

export function parseFlexibleDate(input: string): { year: number; month: number; day?: number } | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const iso = trimmed.match(/^(\d{4})-(\d{1,2})(?:-(\d{1,2}))?/);
  if (iso) {
    return {
      year: Number(iso[1]),
      month: Number(iso[2]),
      day: iso[3] ? Number(iso[3]) : undefined,
    };
  }

  const monthYear = trimmed.match(/^(\d{1,2})[/.-](\d{4})$/);
  if (monthYear) {
    return { year: Number(monthYear[2]), month: Number(monthYear[1]) };
  }

  const parts = trimmed.split(/[/.-]/).map((part) => part.trim()).filter(Boolean);
  if (parts.length === 3) {
    const nums = parts.map((part) => Number(part));
    if (nums.some((value) => Number.isNaN(value))) return null;

    let [a, b, c] = nums;
    let day: number | undefined;
    let month: number;
    let year: number;

    if (parts[2].length === 4) {
      month = a;
      day = b;
      year = c;
    } else {
      year = normalizeYear(c);
      if (a > 12 && b <= 12) {
        day = a;
        month = b;
      } else if (b > 12 && a <= 12) {
        month = a;
        day = b;
      } else {
        month = a;
        day = b;
      }
    }

    if (month < 1 || month > 12) return null;
    return { year, month, day };
  }

  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    return {
      year: parsed.getFullYear(),
      month: parsed.getMonth() + 1,
      day: parsed.getDate(),
    };
  }

  return null;
}

export function periodKeyFromDate(input: string): string | null {
  const parsed = parseFlexibleDate(input);
  if (!parsed) return null;
  return periodKeyFromParts(parsed.year, parsed.month);
}

function periodKeyFromLabel(label: string): string | null {
  const trimmed = label.trim();
  if (/^\d{4}-\d{2}$/.test(trimmed)) return trimmed;

  const parsed = parseFlexibleDate(trimmed);
  if (parsed) return periodKeyFromParts(parsed.year, parsed.month);

  const monthYear = trimmed.match(/(\d{1,2})[/.-](\d{2,4})/);
  if (monthYear) {
    return periodKeyFromParts(normalizeYear(Number(monthYear[2])), Number(monthYear[1]));
  }

  return null;
}

export function resolvePeriodForDate(
  dateValue: string,
  existingPeriods: string[],
  fallbackPeriod: string
): string {
  const key = periodKeyFromDate(dateValue);
  if (!key) return fallbackPeriod;

  if (existingPeriods.includes(key)) return key;

  for (const period of existingPeriods) {
    if (periodKeyFromLabel(period) === key) return period;
  }

  return fallbackPeriod;
}

export function orderedPeriodKeys(
  periodRows: Record<string, unknown[]>,
  previousOrder: string[]
) {
  const keys = new Set(Object.keys(periodRows));
  const ordered = previousOrder.filter((key) => keys.has(key));
  const remaining = [...keys].filter((key) => !ordered.includes(key));
  remaining.sort((left, right) => {
    const leftKey = periodKeyFromLabel(left) ?? left;
    const rightKey = periodKeyFromLabel(right) ?? right;
    return leftKey.localeCompare(rightKey);
  });
  return [...ordered, ...remaining];
}

export function reassignGlobalTransactionIds<T extends { id: number }>(
  periodRows: Record<string, T[]>,
  previousOrder: string[] = []
) {
  const orderedKeys = orderedPeriodKeys(periodRows, previousOrder);
  const next: Record<string, T[]> = {};
  let id = 0;

  for (const period of orderedKeys) {
    next[period] = (periodRows[period] ?? []).map((row) => ({
      ...row,
      id: id++,
    }));
  }

  return next;
}

export function filterReportablePeriodOrder<TRow>(
  periodOrder: string[],
  periodRows: Record<string, TRow[]>,
  hasData: (rows: TRow[]) => boolean
): string[] {
  return periodOrder.filter((period) => hasData(periodRows[period] ?? []));
}

export function deriveUploadPeriods(periodRows: Record<string, unknown[]>): string[] {
  return orderedPeriodKeys(periodRows, Object.keys(periodRows));
}

export function consolidateRowsIntoUploadPeriods<
  T extends { period: string; date?: string }
>(
  periodRows: Record<string, T[]>,
  uploadPeriods: string[]
): Record<string, T[]> {
  const consolidated = Object.fromEntries(
    uploadPeriods.map((period) => [period, [] as T[]])
  ) as Record<string, T[]>;
  const fallback = uploadPeriods[uploadPeriods.length - 1] ?? uploadPeriods[0];

  if (!fallback) return consolidated;

  for (const [sourceKey, rows] of Object.entries(periodRows)) {
    for (const row of rows) {
      let target: string;
      if (uploadPeriods.includes(sourceKey)) {
        target = sourceKey;
      } else if (row.date?.trim()) {
        target = resolvePeriodForDate(row.date, uploadPeriods, fallback);
      } else if (uploadPeriods.includes(row.period)) {
        target = row.period;
      } else {
        target = fallback;
      }

      consolidated[target].push({ ...row, period: target });
    }
  }

  return consolidated;
}
