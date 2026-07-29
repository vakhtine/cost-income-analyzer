import { canonicalExpenseCategory } from "@/lib/category-normalize";
import { filterExpenseTransactions, isExpenseTransaction, sumExpenseAmount } from "@/lib/transaction-filters";
import { CategorySummary, Transaction } from "@/lib/types";
import { mean, round2, stdDev } from "@/lib/utils";
import { parseFlexibleDate, periodKeyFromParts } from "@/lib/period-utils";

export const RECURRING_EXPENSE_CATEGORIES = new Set([
  "rent",
  "telecommunications",
  "insurance",
  "utilities",
  "subscriptions",
  "mortgage",
  "mortgage payment",
  "loan payment",
  "phone",
  "internet",
]);

export type ExpenseSpendType = "RECURRING" | "VARIABLE";

export function expenseSpendType(category: string): ExpenseSpendType {
  return RECURRING_EXPENSE_CATEGORIES.has(category.trim().toLowerCase())
    ? "RECURRING"
    : "VARIABLE";
}

export type ConcentrationMetrics = {
  hhi: number;
  top_category: string;
  top_category_share_pct: number;
  category_count: number;
  interpretation: string;
};

export function computeHerfindahlIndex(
  expenseCategories: CategorySummary[],
  totalExpenses: number
): ConcentrationMetrics {
  if (!totalExpenses || !expenseCategories.length) {
    return {
      hhi: 0,
      top_category: "—",
      top_category_share_pct: 0,
      category_count: 0,
      interpretation: "No expense data to measure concentration.",
    };
  }

  const shares = expenseCategories.map((item) => item.total / totalExpenses);
  const hhi = round2(shares.reduce((sum, share) => sum + share * share, 0));
  const top = expenseCategories[0];
  const topShare = top ? round2((top.total / totalExpenses) * 100) : 0;

  let interpretation = "";
  if (hhi >= 0.4) {
    interpretation = `${hhi.toFixed(2)} is high concentration — ${top?.category ?? "one category"} alone accounts for ${topShare.toFixed(1)}% of expenses. A well-diversified budget typically scores below 0.25.`;
  } else if (hhi >= 0.25) {
    interpretation = `${hhi.toFixed(2)} indicates moderate concentration. Consider whether a few categories dominate your budget.`;
  } else {
    interpretation = `${hhi.toFixed(2)} indicates well-diversified spending across categories.`;
  }

  return {
    hhi,
    top_category: top?.category ?? "—",
    top_category_share_pct: topShare,
    category_count: expenseCategories.length,
    interpretation,
  };
}

export type CategoryVolatility = {
  category: string;
  volatility_pct: number;
  std_dev_amount: number;
  period_totals: { period: string; total: number }[];
  avg_total: number;
};

export function computeCategoryVolatility(
  periodRows: Record<string, Transaction[]>,
  periodOrder: string[]
): CategoryVolatility[] {
  if (periodOrder.length <= 1) return [];

  const categoryMap = new Map<string, Map<string, number>>();

  for (const period of periodOrder) {
    for (const row of periodRows[period] ?? []) {
      if (!isExpenseTransaction(row)) continue;
      const category = canonicalExpenseCategory(row.category);
      if (!categoryMap.has(category)) categoryMap.set(category, new Map());
      const periodMap = categoryMap.get(category)!;
      periodMap.set(period, (periodMap.get(period) ?? 0) + row.abs_amount);
    }
  }

  const results: CategoryVolatility[] = [];

  for (const [category, periodMap] of categoryMap) {
    const period_totals = periodOrder.map((period) => ({
      period,
      total: round2(periodMap.get(period) ?? 0),
    }));
    const totals = period_totals.map((item) => item.total).filter((value) => value > 0);
    if (totals.length <= 1) continue;

    const avg = mean(totals);
    const deviation = stdDev(totals);
    const volatility = avg ? (deviation / avg) * 100 : 0;
    if (volatility < 0.01) continue;

    results.push({
      category,
      volatility_pct: round2(volatility),
      std_dev_amount: round2(deviation),
      period_totals,
      avg_total: round2(avg),
    });
  }

  return results.sort((a, b) => b.volatility_pct - a.volatility_pct);
}

export type AnomalyFlag = {
  merchant_name: string;
  category: string;
  amount: number;
  period: string;
  transaction_count: number;
  multiplier: number;
  description: string;
};

function categoryHistoricalStats(
  periodRows: Record<string, Transaction[]>,
  periodOrder: string[],
  excludePeriod: string
) {
  const stats = new Map<string, { amounts: number[]; count: number }>();

  for (const period of periodOrder) {
    if (period === excludePeriod) continue;
    for (const row of periodRows[period] ?? []) {
      if (!isExpenseTransaction(row)) continue;
      const key = canonicalExpenseCategory(row.category);
      const current = stats.get(key) ?? { amounts: [], count: 0 };
      current.amounts.push(row.abs_amount);
      current.count += 1;
      stats.set(key, current);
    }
  }

  const result = new Map<string, { mean: number; std: number; count: number }>();
  for (const [category, data] of stats) {
    const avg = mean(data.amounts);
    result.set(category, {
      mean: avg,
      std: stdDev(data.amounts),
      count: data.count,
    });
  }
  return result;
}

export function detectAnomalies(
  periodRows: Record<string, Transaction[]>,
  periodOrder: string[],
  targetPeriod: string
): { anomalies: AnomalyFlag[]; total_transactions: number } {
  const rows = filterExpenseTransactions(periodRows[targetPeriod] ?? []);
  const historical = categoryHistoricalStats(periodRows, periodOrder, targetPeriod);

  const merchantGroups = new Map<
    string,
    { merchant_name: string; category: string; total: number; count: number; max: number }
  >();

  for (const row of rows) {
    const category = canonicalExpenseCategory(row.category);
    const key = `${row.merchant_name}::${category}`;
    const current = merchantGroups.get(key) ?? {
      merchant_name: row.merchant_name,
      category,
      total: 0,
      count: 0,
      max: 0,
    };
    current.total += row.abs_amount;
    current.count += 1;
    current.max = Math.max(current.max, row.abs_amount);
    merchantGroups.set(key, current);
  }

  const anomalies: AnomalyFlag[] = [];

  for (const group of merchantGroups.values()) {
    const baseline = historical.get(group.category);
    if (!baseline || baseline.count < 2) {
      const periodTotals = periodOrder
        .filter((period) => period !== targetPeriod)
        .map((period) =>
          (periodRows[period] ?? [])
            .filter(
              (row) =>
                isExpenseTransaction(row) &&
                canonicalExpenseCategory(row.category) === group.category
            )
            .reduce((sum, row) => sum + row.abs_amount, 0)
        )
        .filter((total) => total > 0);

      if (periodTotals.length >= 1) {
        const avgPeriodTotal = mean(periodTotals);
        if (avgPeriodTotal > 0 && group.total >= avgPeriodTotal * 2) {
          anomalies.push({
            merchant_name: group.merchant_name,
            category: group.category,
            amount: round2(group.total),
            period: targetPeriod,
            transaction_count: group.count,
            multiplier: round2(group.total / avgPeriodTotal),
            description: `${round2(group.total / avgPeriodTotal)}x your usual spending in this expenses category (based on your other months, not market averages)`,
          });
        }
      }
      continue;
    }

    const threshold = Math.max(baseline.mean + baseline.std * 2, baseline.mean * 2.5);
    if (group.total >= threshold && group.total > baseline.mean * 1.5) {
      anomalies.push({
        merchant_name: group.merchant_name,
        category: group.category,
        amount: round2(group.total),
        period: targetPeriod,
        transaction_count: group.count,
        multiplier: baseline.mean ? round2(group.total / baseline.mean) : 0,
        description: baseline.mean
          ? `${round2(group.total / baseline.mean)}x your usual spending in this expenses category (based on your past months, not market averages)`
          : "Unusually high compared to your past spending in this expenses category",
      });
    }
  }

  return {
    anomalies: anomalies.sort((a, b) => b.amount - a.amount),
    total_transactions: rows.length,
  };
}

export type CategoryTrend = {
  category: string;
  current_total: number;
  prior_total: number;
  change_pct: number;
  trend: "Spike" | "Up" | "Down" | "Stable";
};

export function computeCategoryTrends(
  periodRows: Record<string, Transaction[]>,
  periodOrder: string[],
  currentPeriod: string
): CategoryTrend[] | null {
  const currentIndex = periodOrder.indexOf(currentPeriod);
  if (currentIndex <= 0) return null;

  const priorPeriod = periodOrder[currentIndex - 1];
  const currentRows = periodRows[currentPeriod] ?? [];
  const priorRows = periodRows[priorPeriod] ?? [];

  const currentTotals = new Map<string, number>();
  const priorTotals = new Map<string, number>();

  for (const row of currentRows) {
    if (!isExpenseTransaction(row)) continue;
    const category = canonicalExpenseCategory(row.category);
    currentTotals.set(category, (currentTotals.get(category) ?? 0) + row.abs_amount);
  }
  for (const row of priorRows) {
    if (!isExpenseTransaction(row)) continue;
    const category = canonicalExpenseCategory(row.category);
    priorTotals.set(category, (priorTotals.get(category) ?? 0) + row.abs_amount);
  }

  const categories = new Set([...currentTotals.keys(), ...priorTotals.keys()]);
  const trends: CategoryTrend[] = [];

  for (const category of categories) {
    const current_total = round2(currentTotals.get(category) ?? 0);
    const prior_total = round2(priorTotals.get(category) ?? 0);
    if (current_total === 0 && prior_total === 0) continue;

    let change_pct = 0;
    if (prior_total > 0) {
      change_pct = round2(((current_total - prior_total) / prior_total) * 100);
    } else if (current_total > 0) {
      change_pct = 100;
    }

    let trend: CategoryTrend["trend"] = "Stable";
    if (Math.abs(change_pct) < 5) trend = "Stable";
    else if (change_pct >= 100) trend = "Spike";
    else if (change_pct > 0) trend = "Up";
    else trend = "Down";

    trends.push({ category, current_total, prior_total, change_pct, trend });
  }

  return trends.sort((a, b) => Math.abs(b.change_pct) - Math.abs(a.change_pct));
}

export type DailySpendPoint = {
  date: string;
  amount: number;
  period: string;
};

export function computeDailySpendSeries(
  periodRows: Record<string, Transaction[]>,
  periodOrder: string[],
  startPeriod?: string,
  endPeriod?: string
): DailySpendPoint[] {
  const startIndex = startPeriod ? periodOrder.indexOf(startPeriod) : 0;
  const endIndex = endPeriod ? periodOrder.indexOf(endPeriod) : periodOrder.length - 1;
  if (startIndex < 0 || endIndex < 0) return [];

  const selected = periodOrder.slice(startIndex, endIndex + 1);
  const dayMap = new Map<string, { amount: number; period: string }>();

  for (const period of selected) {
    for (const row of periodRows[period] ?? []) {
      if (!isExpenseTransaction(row) || !row.date?.trim()) continue;
      const parsed = parseFlexibleDate(row.date);
      if (!parsed) continue;
      const key = periodKeyFromParts(parsed.year, parsed.month) + `-${String(parsed.day ?? 1).padStart(2, "0")}`;
      const current = dayMap.get(key) ?? { amount: 0, period };
      current.amount += row.abs_amount;
      dayMap.set(key, current);
    }
  }

  return [...dayMap.entries()]
    .map(([date, value]) => ({ date, amount: round2(value.amount), period: value.period }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export type PeriodExpenseTrend = {
  period: string;
  total_expenses: number;
  change_pct: number | null;
};

export function computePeriodExpenseTrends(
  periodRows: Record<string, Transaction[]>,
  periodOrder: string[]
): PeriodExpenseTrend[] {
  const trends: PeriodExpenseTrend[] = [];
  let previousTotal: number | null = null;

  for (const period of periodOrder) {
    const total_expenses = round2(sumExpenseAmount(periodRows[period] ?? []));

    let change_pct: number | null = null;
    if (previousTotal !== null && previousTotal > 0) {
      change_pct = round2(((total_expenses - previousTotal) / previousTotal) * 100);
    }

    trends.push({ period, total_expenses, change_pct });
    previousTotal = total_expenses;
  }

  return trends;
}

export function adjacentPeriodPair(periodOrder: string[], currentPeriod: string) {
  const currentIndex = periodOrder.indexOf(currentPeriod);
  if (currentIndex <= 0) return null;
  return {
    currentPeriod,
    priorPeriod: periodOrder[currentIndex - 1],
  };
}

export function buildSparklineSvg(
  points: DailySpendPoint[],
  width = 280,
  height = 48
): string {
  if (points.length < 2) return "";

  const max = Math.max(...points.map((point) => point.amount), 1);
  const step = width / (points.length - 1);
  const coords = points.map((point, index) => {
    const x = index * step;
    const y = height - (point.amount / max) * (height - 4) - 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Daily spend trend">
    <polyline fill="none" stroke="#1a6b7c" stroke-width="2" points="${coords.join(" ")}" />
  </svg>`;
}

export function periodRangeLabel(start: string, end: string) {
  return start === end ? start : `${start} – ${end}`;
}

export function slicePeriodOrder(periodOrder: string[], start: string, end: string) {
  const startIndex = periodOrder.indexOf(start);
  const endIndex = periodOrder.indexOf(end);
  if (startIndex < 0 || endIndex < 0) return [];
  const [from, to] = startIndex <= endIndex ? [startIndex, endIndex] : [endIndex, startIndex];
  return periodOrder.slice(from, to + 1);
}

export function combinePeriodRowsInRange(
  periodRows: Record<string, Transaction[]>,
  periodOrder: string[],
  start: string,
  end: string
): Transaction[] {
  return slicePeriodOrder(periodOrder, start, end).flatMap((period) => periodRows[period] ?? []);
}
