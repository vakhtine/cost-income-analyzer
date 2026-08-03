import { NON_ESSENTIAL_CATEGORIES } from "@/lib/constants";
import { computeHerfindahlIndex } from "@/lib/spending-metrics";
import {
  filterExpenseTransactions,
  filterIncomeTransactions,
  periodHasReportableData,
  sumExpenseAmount,
  sumIncomeAmount,
} from "@/lib/transaction-filters";
import { CategorySummary, HealthScore, Transaction } from "@/lib/types";
import { mean, round2, stdDev } from "@/lib/utils";

const SYNTHETIC_PERIOD_KEYS = new Set(["All periods", "__average__"]);

/** Weights for the four financial health score factors (must sum to 1). */
export const HEALTH_SCORE_WEIGHTS = {
  savings_rate: 0.3,
  income_stability: 0.25,
  expense_stability: 0.25,
  non_essential: 0.2,
} as const;

export function computeOverallHealthScore(scores: {
  savings_rate_score: number;
  income_stability_score: number;
  expense_stability_score: number;
  non_essential_score: number;
}) {
  return Math.round(
    scores.savings_rate_score * HEALTH_SCORE_WEIGHTS.savings_rate +
      scores.income_stability_score * HEALTH_SCORE_WEIGHTS.income_stability +
      scores.expense_stability_score * HEALTH_SCORE_WEIGHTS.expense_stability +
      scores.non_essential_score * HEALTH_SCORE_WEIGHTS.non_essential
  );
}

function scoreDiversification(hhi: number) {
  if (hhi <= 0.15) return 95;
  if (hhi <= 0.25) return 80;
  if (hhi <= 0.4) return 60;
  if (hhi <= 0.6) return 40;
  return 25;
}

function buildExpenseCategorySummaries(
  rows: Transaction[],
  totalIncome: number,
  totalExpenses: number
): CategorySummary[] {
  const map = new Map<string, { total: number; count: number }>();
  for (const row of filterExpenseTransactions(rows)) {
    const current = map.get(row.category) ?? { total: 0, count: 0 };
    current.total += row.abs_amount;
    current.count += 1;
    map.set(row.category, current);
  }
  return [...map.entries()]
    .map(([category, value]) => ({
      category,
      total: value.total,
      count: value.count,
      pct_of_income: totalIncome ? (value.total / totalIncome) * 100 : 0,
      pct_of_expenses: totalExpenses ? (value.total / totalExpenses) * 100 : 0,
    }))
    .sort((a, b) => b.total - a.total);
}

function scoreSavingsRate(savingsRate: number) {
  if (savingsRate < 0) {
    return Math.max(0, Math.round(35 + savingsRate * 2));
  }
  // Linear 0–30% savings rate maps to 0–100 score (30%+ caps at 100).
  return Math.min(100, Math.round((savingsRate / 30) * 100));
}

function incomeStabilityDetail(
  allPeriodRows: Record<string, Transaction[]>,
  focusPeriod: string,
  contextPeriods: string[],
  score: number
): string {
  const focusRows = allPeriodRows[focusPeriod] ?? [];
  const focusIncome = sumIncomeAmount(focusRows);

  if (focusIncome <= 0) {
    return `No income recorded for ${focusPeriod}. Income stability cannot be scored (0/100).`;
  }

  const reportableContext = contextPeriods.filter((name) =>
    periodHasReportableData(allPeriodRows[name] ?? [])
  );
  const incomes = reportableContext.map((name) => sumIncomeAmount(allPeriodRows[name] ?? []));
  const withIncome = incomes.filter((value) => value > 0);

  if (withIncome.length <= 1) {
    const sources = new Set(filterIncomeTransactions(focusRows).map((row) => row.category));
    return `Score ${score}/100 based on ${sources.size} income source(s) in ${focusPeriod}: ${[...sources].join(", ") || "none"}.`;
  }

  const avg = mean(withIncome);
  const volatility = avg ? stdDev(withIncome) / avg : 0;
  return `Compared ${withIncome.length} period(s) with income. Average income ${formatMoney(avg)} with volatility ${(volatility * 100).toFixed(1)}% (std dev / mean). Lower volatility scores higher.`;
}

function scoreNonEssential(rows: Transaction[], totalIncome: number, totalExpenses: number) {
  return scoreNonEssentialFromTotal(
    computeNonEssentialTotal(rows),
    totalIncome,
    totalExpenses
  );
}

function scoreNonEssentialFromTotal(
  nonEssentialTotal: number,
  totalIncome: number,
  totalExpenses: number
) {
  const total = nonEssentialTotal;
  if (!totalIncome) {
    if (!totalExpenses) return 50;
    const ratio = (total / totalExpenses) * 100;
    if (ratio <= 10) return 90;
    if (ratio <= 20) return 75;
    if (ratio <= 35) return 55;
    if (ratio <= 50) return 35;
    return 20;
  }
  const ratio = (total / totalIncome) * 100;
  if (ratio <= 8) return 95;
  if (ratio <= 15) return 75;
  if (ratio <= 25) return 55;
  if (ratio <= 35) return 35;
  return 15;
}

function scoreSavingsRateForPeriod(savingsRate: number, totalIncome: number) {
  if (totalIncome <= 0) return 0;
  return scoreSavingsRate(savingsRate);
}

function resolveContextPeriods(
  allPeriodRows: Record<string, Transaction[]>,
  focusPeriod: string,
  contextPeriodOrder?: string[]
) {
  const fromOrder = (contextPeriodOrder ?? Object.keys(allPeriodRows)).filter(
    (name) => !SYNTHETIC_PERIOD_KEYS.has(name)
  );
  const unique = [...new Set(fromOrder)];
  if (unique.length) return unique;
  return focusPeriod ? [focusPeriod] : [];
}

function computeIncomeVolatility(
  periods: Record<string, Transaction[]>,
  periodNames: string[]
) {
  const incomes = periodNames.map((name) => sumIncomeAmount(periods[name] ?? []));
  const withIncome = incomes.filter((value) => value > 0);
  if (withIncome.length <= 1) return null;
  const avg = mean(withIncome);
  return avg ? (stdDev(withIncome) / avg) * 100 : null;
}

function computeExpenseVolatility(
  periods: Record<string, Transaction[]>,
  periodNames: string[]
) {
  const expenses = periodNames.map((name) => sumExpenseAmount(periods[name] ?? []));
  const withExpenses = expenses.filter((value) => value > 0);
  if (withExpenses.length <= 1) return null;
  const avg = mean(withExpenses);
  return avg ? (stdDev(withExpenses) / avg) * 100 : null;
}

function nonEssentialDetail(
  rows: Transaction[],
  totalIncome: number,
  totalExpenses: number,
  score: number
): string {
  const total = computeNonEssentialTotal(rows);
  const categories = [...new Set(
    filterExpenseTransactions(rows)
      .filter((row) => NON_ESSENTIAL_CATEGORIES.has(row.category.trim().toLowerCase()))
      .map((row) => row.category)
  )].slice(0, 5);

  if (!totalIncome) {
    const ratio = totalExpenses ? (total / totalExpenses) * 100 : 0;
    return `No income recorded this period. Non-essential spending totals ${formatMoney(total)} — ${ratio.toFixed(1)}% of expenses. Matched: ${categories.join(", ") || "none"}. Score ${score}/100.`;
  }

  const ratio = (total / totalIncome) * 100;
  return `Non-essential categories (restaurants, cafes, entertainment, shopping, subscriptions, travel, etc.) total ${formatMoney(total)} — ${ratio.toFixed(1)}% of income. Matched: ${categories.join(", ") || "none"}. Score ${score}/100.`;
}

function savingsRateDetail(
  savingsRate: number,
  totalIncome: number,
  totalExpenses: number,
  score: number,
  focusPeriod: string
) {
  if (totalIncome > 0) {
    return `Savings rate: ${savingsRate.toFixed(1)}% of income kept after expenses for ${focusPeriod}. Score ${score}/100 scales linearly (0% = 0, 30%+ = 100).`;
  }

  return `No income recorded for ${focusPeriod}. Savings rate cannot be calculated (score 0/100). Expenses this period: ${formatMoney(totalExpenses)}.`;
}

function expenseStabilityDetail(
  allPeriodRows: Record<string, Transaction[]>,
  focusPeriod: string,
  contextPeriods: string[],
  score: number
): string {
  const focusRows = allPeriodRows[focusPeriod] ?? [];
  const focusExpenses = sumExpenseAmount(focusRows);

  if (focusExpenses <= 0) {
    return `No expenses recorded for ${focusPeriod}. Expense stability cannot be scored (0/100).`;
  }

  const reportableContext = contextPeriods.filter((name) =>
    periodHasReportableData(allPeriodRows[name] ?? [])
  );
  const expenses = reportableContext.map((name) => sumExpenseAmount(allPeriodRows[name] ?? []));
  const withExpenses = expenses.filter((value) => value > 0);

  if (withExpenses.length <= 1) {
    const categories = new Set(filterExpenseTransactions(focusRows).map((row) => row.category));
    return `Score ${score}/100 based on ${categories.size} expense categor${categories.size === 1 ? "y" : "ies"} in ${focusPeriod}: ${[...categories].slice(0, 5).join(", ") || "none"}.`;
  }

  const avg = mean(withExpenses);
  const volatility = avg ? stdDev(withExpenses) / avg : 0;
  return `Compared ${withExpenses.length} period(s) with spending. Average expenses ${formatMoney(avg)} with volatility ${(volatility * 100).toFixed(1)}% (std dev / mean). Lower volatility scores higher.`;
}

function scoreIncomeStabilityForPeriod(
  allPeriodRows: Record<string, Transaction[]>,
  focusPeriod: string,
  contextPeriods: string[]
) {
  const focusRows = allPeriodRows[focusPeriod] ?? [];
  const focusIncome = sumIncomeAmount(focusRows);
  if (focusIncome <= 0) return 0;

  const reportableContext = contextPeriods.filter((name) =>
    periodHasReportableData(allPeriodRows[name] ?? [])
  );
  const incomes = reportableContext.map((name) => sumIncomeAmount(allPeriodRows[name] ?? []));
  const withIncome = incomes.filter((value) => value > 0);

  if (withIncome.length <= 1) {
    const sources = new Set(filterIncomeTransactions(focusRows).map((row) => row.category));
    if (sources.size >= 3) return 90;
    if (sources.size === 2) return 75;
    return sources.size === 1 ? 60 : 0;
  }

  const avg = mean(withIncome);
  if (!avg) return 0;
  const volatility = stdDev(withIncome) / avg;
  if (volatility <= 0.05) return 95;
  if (volatility <= 0.15) return 75;
  if (volatility <= 0.3) return 55;
  return 35;
}

function scoreExpenseStabilityForPeriod(
  allPeriodRows: Record<string, Transaction[]>,
  focusPeriod: string,
  contextPeriods: string[]
) {
  const focusRows = allPeriodRows[focusPeriod] ?? [];
  const focusExpenses = sumExpenseAmount(focusRows);
  if (focusExpenses <= 0) return 0;

  const reportableContext = contextPeriods.filter((name) =>
    periodHasReportableData(allPeriodRows[name] ?? [])
  );
  const expenses = reportableContext.map((name) => sumExpenseAmount(allPeriodRows[name] ?? []));
  const withExpenses = expenses.filter((value) => value > 0);

  if (withExpenses.length <= 1) {
    const categories = new Set(filterExpenseTransactions(focusRows).map((row) => row.category));
    if (categories.size >= 8) return 90;
    if (categories.size >= 5) return 75;
    return categories.size >= 3 ? 60 : 45;
  }

  const avg = mean(withExpenses);
  if (!avg) return 0;
  const volatility = stdDev(withExpenses) / avg;
  if (volatility <= 0.05) return 95;
  if (volatility <= 0.15) return 75;
  if (volatility <= 0.3) return 55;
  return 35;
}

function healthSummary(score: number) {
  if (score >= 80) return "Strong financial health";
  if (score >= 65) return "Healthy with room to improve";
  if (score >= 50) return "Moderate financial health";
  return "Needs attention";
}

export { healthSummary };

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function computeNonEssentialTotal(rows: Transaction[]) {
  return filterExpenseTransactions(rows)
    .filter((row) => NON_ESSENTIAL_CATEGORIES.has(row.category.trim().toLowerCase()))
    .reduce((sum, row) => sum + row.abs_amount, 0);
}

export function adjustHealthScoreForScenarioIncome(
  base: HealthScore,
  scenarioIncome: number,
  scenarioExpenses: number,
  expenseRows: Transaction[],
  options?: {
    focusPeriod?: string;
    nonEssentialTotal?: number;
  }
): HealthScore {
  const nonEssentialTotal =
    options?.nonEssentialTotal ?? computeNonEssentialTotal(expenseRows);
  const savingsRate =
    scenarioIncome > 0
      ? ((scenarioIncome - scenarioExpenses) / scenarioIncome) * 100
      : 0;
  const nonEssentialPct = scenarioIncome ? (nonEssentialTotal / scenarioIncome) * 100 : 0;

  const savings_rate_score = scoreSavingsRateForPeriod(savingsRate, scenarioIncome);
  const non_essential_score = scoreNonEssentialFromTotal(
    nonEssentialTotal,
    scenarioIncome,
    scenarioExpenses
  );
  const overall = computeOverallHealthScore({
    savings_rate_score,
    income_stability_score: base.income_stability_score,
    expense_stability_score: base.expense_stability_score,
    non_essential_score,
  });
  const focusPeriod = options?.focusPeriod ?? "this period";

  return {
    ...base,
    overall,
    savings_rate_score,
    non_essential_score,
    summary: healthSummary(overall),
    details: [
      savingsRateDetail(
        savingsRate,
        scenarioIncome,
        scenarioExpenses,
        savings_rate_score,
        focusPeriod
      ),
      base.details[1],
      base.details[2],
      nonEssentialDetail(
        expenseRows,
        scenarioIncome,
        scenarioExpenses,
        non_essential_score
      ),
    ],
    metrics: base.metrics
      ? {
          ...base.metrics,
          savings_rate_pct: savingsRate,
          total_income: scenarioIncome,
          total_expenses: scenarioExpenses,
          net_savings: scenarioIncome - scenarioExpenses,
          non_essential_pct: nonEssentialPct,
          non_essential_total: nonEssentialTotal,
          expense_to_income_ratio:
            scenarioIncome > 0 ? (scenarioExpenses / scenarioIncome) * 100 : 0,
          essential_expense_pct:
            scenarioExpenses > 0
              ? ((scenarioExpenses - nonEssentialTotal) / scenarioExpenses) * 100
              : 0,
          non_essential_of_expenses_pct:
            scenarioExpenses > 0 ? (nonEssentialTotal / scenarioExpenses) * 100 : 0,
        }
      : undefined,
  };
}

export function calculateHealthScoreForPeriod(
  allPeriodRows: Record<string, Transaction[]>,
  focusPeriod: string,
  contextPeriodOrder?: string[]
): HealthScore {
  const contextPeriods = resolveContextPeriods(allPeriodRows, focusPeriod, contextPeriodOrder);
  const focusRows = allPeriodRows[focusPeriod] ?? [];
  const totalIncome = sumIncomeAmount(focusRows);
  const expenseCategorySummaries = buildExpenseCategorySummaries(focusRows, totalIncome, 0);
  const totalExpenses = round2(sumExpenseAmount(focusRows));
  const savingsRate = totalIncome ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0;
  const nonEssentialTotal = computeNonEssentialTotal(focusRows);
  const nonEssentialPct = totalIncome ? (nonEssentialTotal / totalIncome) * 100 : 0;
  const expenseCategoriesForMetrics = buildExpenseCategorySummaries(
    focusRows,
    totalIncome,
    totalExpenses
  );
  const concentration = computeHerfindahlIndex(expenseCategoriesForMetrics, totalExpenses);
  const diversification_score = scoreDiversification(concentration.hhi);
  const largestExpense = expenseCategoriesForMetrics[0];
  const incomeSources = new Set(filterIncomeTransactions(focusRows).map((row) => row.category));

  const savings_rate_score = scoreSavingsRateForPeriod(savingsRate, totalIncome);
  const income_stability_score = scoreIncomeStabilityForPeriod(
    allPeriodRows,
    focusPeriod,
    contextPeriods
  );
  const expense_stability_score = scoreExpenseStabilityForPeriod(
    allPeriodRows,
    focusPeriod,
    contextPeriods
  );
  const non_essential_score = scoreNonEssential(focusRows, totalIncome, totalExpenses);
  const overall = computeOverallHealthScore({
    savings_rate_score,
    income_stability_score,
    expense_stability_score,
    non_essential_score,
  });

  return {
    overall,
    savings_rate_score,
    income_stability_score,
    expense_stability_score,
    non_essential_score,
    summary: healthSummary(overall),
    details: [
      savingsRateDetail(
        savingsRate,
        totalIncome,
        totalExpenses,
        savings_rate_score,
        focusPeriod
      ),
      incomeStabilityDetail(allPeriodRows, focusPeriod, contextPeriods, income_stability_score),
      expenseStabilityDetail(allPeriodRows, focusPeriod, contextPeriods, expense_stability_score),
      nonEssentialDetail(focusRows, totalIncome, totalExpenses, non_essential_score),
    ],
    metrics: {
      savings_rate_pct: savingsRate,
      total_income: totalIncome,
      total_expenses: totalExpenses,
      net_savings: totalIncome - totalExpenses,
      non_essential_pct: nonEssentialPct,
      non_essential_total: nonEssentialTotal,
      income_source_count: incomeSources.size,
      period_count: contextPeriods.filter((name) =>
        periodHasReportableData(allPeriodRows[name] ?? [])
      ).length,
      income_volatility_pct: computeIncomeVolatility(allPeriodRows, contextPeriods),
      expense_to_income_ratio: totalIncome ? (totalExpenses / totalIncome) * 100 : 0,
      largest_expense_category: largestExpense?.category ?? "—",
      largest_expense_amount: largestExpense?.total ?? 0,
      essential_expense_pct:
        totalExpenses > 0
          ? ((totalExpenses - nonEssentialTotal) / totalExpenses) * 100
          : 0,
      avg_daily_spend: totalExpenses / 30,
      non_essential_of_expenses_pct:
        totalExpenses > 0 ? (nonEssentialTotal / totalExpenses) * 100 : 0,
      expense_volatility_pct: computeExpenseVolatility(allPeriodRows, contextPeriods),
      expense_concentration_hhi: concentration.hhi,
      top_category_share_pct: concentration.top_category_share_pct,
      diversification_score,
    },
  };
}

export function calculateHealthScore(periods: Record<string, Transaction[]>): HealthScore {
  const names = Object.keys(periods).filter((name) => !SYNTHETIC_PERIOD_KEYS.has(name));
  const focusPeriod = names[names.length - 1];
  return calculateHealthScoreForPeriod(periods, focusPeriod, names);
}

export const HEALTH_SCORE_METHODOLOGY = {
  income_stability:
    "Scores income for the selected period. With no income in that period, the score is 0. With multiple periods that have income, we measure how much total income swings month to month.",
  expense_stability:
    "Scores expenses for the selected period. With no spending in that period, the score is 0. With multiple periods that have expenses, we measure how much total spending swings month to month. Lower volatility scores higher.",
  non_essential:
    "We total spending in discretionary categories — restaurants, cafes, fast food, entertainment, shopping, subscriptions, travel, and similar — then divide by your income. Lower ratios score higher. Transfers between your own accounts are excluded.",
  savings_rate:
    "Requires income in the selected period. Score scales linearly from 0% savings (0 points) to 30%+ savings (100 points). Example: 25% savings ≈ 83/100.",
  expense_concentration:
    "Herfindahl-Hirschman Index (HHI) of your expenses categories for the selected period. Lower values mean spending is spread across more categories; higher values mean one or two categories dominate (0 = perfectly spread, 1 = one category only).",
  expense_volatility:
    "Month-to-month variation in your total expenses, measured as coefficient of variation across periods with spending.",
};
