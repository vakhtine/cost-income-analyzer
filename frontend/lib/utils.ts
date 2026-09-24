export function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

/** Percent change from prior → current. Returns null when prior is zero and current is not (undefined/infinite change). */
export function pctChange(previous: number, current: number): number | null {
  if (previous === 0) {
    if (current === 0) return 0;
    return null;
  }
  return ((current - previous) / previous) * 100;
}

export function formatPctChangeLabel(
  changePct: number | null,
  options?: { prior?: number; current?: number; signed?: boolean }
): string {
  const prior = options?.prior ?? 0;
  const current = options?.current ?? 0;
  if (changePct === null) {
    if (prior === 0 && current > 0) return "New category";
    if (current === 0 && prior > 0) return "No longer spent";
    return "N/A";
  }
  const prefix = options?.signed !== false && changePct > 0 ? "+" : "";
  return `${prefix}${changePct.toFixed(1)}%`;
}

/** Gap vs reference benchmark. Returns null when user has no spending in that category. */
export function comparisonGapPct(userAmount: number, referenceAmount: number): number | null {
  if (!referenceAmount) return null;
  if (userAmount === 0) return null;
  return round2(((userAmount - referenceAmount) / referenceAmount) * 100);
}

export function round2(value: number) {
  return Math.round(value * 100) / 100;
}

export function mean(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function stdDev(values: number[]) {
  if (!values.length) return 0;
  const avg = mean(values);
  const variance = values.reduce((sum, value) => sum + (value - avg) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

export function calendarDaysForPeriodKeys(periodKeys: string[]): number {
  let total = 0;
  for (const key of periodKeys) {
    const match = key.match(/^(\d{4})-(\d{2})$/);
    if (match) {
      total += new Date(Number(match[1]), Number(match[2]), 0).getDate();
    } else {
      total += 30;
    }
  }
  return Math.max(total, 1);
}
