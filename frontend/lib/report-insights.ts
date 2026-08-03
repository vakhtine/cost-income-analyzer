import { canonicalExpenseCategory } from "@/lib/category-normalize";
import { filterExpenseTransactions } from "@/lib/transaction-filters";
import { CategoryTrend } from "@/lib/spending-metrics";
import { Transaction } from "@/lib/types";
import { round2 } from "@/lib/utils";

export type MerchantCategoryStat = {
  merchant_name: string;
  total: number;
  transaction_count: number;
  avg_transaction: number;
  max_transaction: number;
  pct_of_category: number;
};

export function merchantStatsByCategory(
  rows: Transaction[],
  category: string,
  limit = 3
): MerchantCategoryStat[] {
  const canonical = canonicalExpenseCategory(category);
  const merchants = new Map<
    string,
    { total: number; count: number; max: number }
  >();

  for (const row of filterExpenseTransactions(rows)) {
    if (canonicalExpenseCategory(row.category) !== canonical) continue;
    const current = merchants.get(row.merchant_name) ?? { total: 0, count: 0, max: 0 };
    current.total += row.abs_amount;
    current.count += 1;
    current.max = Math.max(current.max, row.abs_amount);
    merchants.set(row.merchant_name, current);
  }

  const categoryTotal =
    [...merchants.values()].reduce((sum, item) => sum + item.total, 0) || 1;

  return [...merchants.entries()]
    .map(([merchant_name, data]) => ({
      merchant_name,
      total: round2(data.total),
      transaction_count: data.count,
      avg_transaction: round2(data.total / data.count),
      max_transaction: round2(data.max),
      pct_of_category: round2((data.total / categoryTotal) * 100),
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);
}

export type TopExpenseTransaction = {
  merchant_name: string;
  category: string;
  amount: number;
  date: string;
};

export function topExpenseTransactions(rows: Transaction[], limit = 8): TopExpenseTransaction[] {
  return filterExpenseTransactions(rows)
    .slice()
    .sort((a, b) => b.abs_amount - a.abs_amount)
    .slice(0, limit)
    .map((row) => ({
      merchant_name: row.merchant_name,
      category: canonicalExpenseCategory(row.category),
      amount: round2(row.abs_amount),
      date: row.date ?? "—",
    }));
}

export type TopMerchantSpend = {
  label: string;
  value: number;
  category: string;
};

export function topMerchantsForPeriod(rows: Transaction[], limit = 10): TopMerchantSpend[] {
  const merchants = new Map<string, { total: number; category: string }>();

  for (const row of filterExpenseTransactions(rows)) {
    const current = merchants.get(row.merchant_name) ?? {
      total: 0,
      category: canonicalExpenseCategory(row.category),
    };
    current.total += row.abs_amount;
    merchants.set(row.merchant_name, current);
  }

  return [...merchants.entries()]
    .map(([merchant_name, data]) => ({
      label: merchant_name,
      value: round2(data.total),
      category: data.category,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

function merchantTotalsByCategory(rows: Transaction[]) {
  const map = new Map<string, Map<string, number>>();
  for (const row of filterExpenseTransactions(rows)) {
    const category = canonicalExpenseCategory(row.category);
    const merchants = map.get(category) ?? new Map<string, number>();
    merchants.set(row.merchant_name, (merchants.get(row.merchant_name) ?? 0) + row.abs_amount);
    map.set(category, merchants);
  }
  return map;
}

export type CategoryChangeExplanation = {
  category: string;
  change_pct: number;
  current_total: number;
  prior_total: number;
  explanation: string;
};

export function buildCategoryChangeExplanations(
  trends: CategoryTrend[],
  periodRows: Record<string, Transaction[]>,
  currentPeriod: string,
  priorPeriod: string,
  limit = 6,
  formatAmount?: (amount: number) => string
): CategoryChangeExplanation[] {
  const currentMap = merchantTotalsByCategory(periodRows[currentPeriod] ?? []);
  const priorMap = merchantTotalsByCategory(periodRows[priorPeriod] ?? []);

  return trends.slice(0, limit).map((trend) => {
    const category = canonicalExpenseCategory(trend.category);
    const currentMerchants = currentMap.get(category) ?? new Map();
    const priorMerchants = priorMap.get(category) ?? new Map();

    let topMerchant = "";
    let topDelta = 0;

    for (const [merchant, amount] of currentMerchants) {
      const priorAmount = priorMerchants.get(merchant) ?? 0;
      const delta = amount - priorAmount;
      if (Math.abs(delta) > Math.abs(topDelta)) {
        topDelta = delta;
        topMerchant = merchant;
      }
    }

    if (!topMerchant && currentMerchants.size) {
      topMerchant = [...currentMerchants.entries()].sort((a, b) => b[1] - a[1])[0][0];
      topDelta = currentMerchants.get(topMerchant) ?? 0;
    }

    const pctLabel =
      Math.abs(trend.change_pct) >= 100
        ? "100"
        : Math.abs(trend.change_pct).toFixed(0);

    const amountDetail = formatAmount
      ? ` (${formatAmount(trend.current_total)} vs ${formatAmount(trend.prior_total)} from the previous month).`
      : ` ($${trend.current_total.toFixed(2)} vs $${trend.prior_total.toFixed(2)} from the previous month).`;

    let explanation: string;
    if (Math.abs(trend.change_pct) < 5) {
      explanation = `${category} held steady from the previous month${amountDetail}`;
    } else if (trend.change_pct > 0) {
      explanation = `${category} increased ${pctLabel}% from the previous month${amountDetail}`;
    } else {
      explanation = `${category} decreased ${pctLabel}% from the previous month${amountDetail}`;
    }

    if (topMerchant && Math.abs(topDelta) > 0 && trend.change_pct >= 5) {
      explanation += ` Largest driver was ${topMerchant}.`;
    } else if (topMerchant && trend.change_pct <= -5) {
      explanation += ` Largest reduction was ${topMerchant}.`;
    } else if (trend.prior_total === 0 && trend.current_total > 0 && topMerchant) {
      explanation = `${category} increased from the previous month. Largest driver was ${topMerchant}.`;
    } else if (trend.current_total === 0 && trend.prior_total > 0) {
      explanation = `${category} decreased from the previous month — no spending recorded this period.`;
    }

    return {
      category,
      change_pct: trend.change_pct,
      current_total: trend.current_total,
      prior_total: trend.prior_total,
      explanation,
    };
  });
}
