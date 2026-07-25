import { NON_ESSENTIAL_CATEGORIES } from "@/lib/constants";
import { HealthScore, Transaction } from "@/lib/types";
import { mean, stdDev } from "@/lib/utils";

function scoreSavingsRate(savingsRate: number) {
  if (savingsRate >= 20) return 100;
  if (savingsRate >= 10) return 80;
  if (savingsRate >= 0) return 55;
  if (savingsRate >= -10) return 35;
  return 15;
}

function incomeStabilityDetail(
  periods: Record<string, Transaction[]>,
  score: number
): string {
  const names = Object.keys(periods);
  const incomes = names.map((name) =>
    periods[name]
      .filter((row) => row.transaction_type === "income")
      .reduce((sum, row) => sum + row.abs_amount, 0)
  );

  if (incomes.length <= 1) {
    const latest = periods[names[names.length - 1]];
    const sources = new Set(
      latest.filter((row) => row.transaction_type === "income").map((row) => row.category)
    );
    return `Single period detected. Score ${score}/100 based on ${sources.size} income source(s): ${[...sources].join(", ") || "none"}.`;
  }

  const avg = mean(incomes);
  const volatility = avg ? stdDev(incomes) / avg : 0;
  return `Compared ${incomes.length} periods. Average income ${formatMoney(avg)} with volatility ${(volatility * 100).toFixed(1)}% (std dev / mean). Lower volatility scores higher.`;
}

function nonEssentialDetail(rows: Transaction[], totalIncome: number, score: number): string {
  const matches = rows.filter(
    (row) =>
      row.transaction_type === "expense" &&
      NON_ESSENTIAL_CATEGORIES.has(row.category.trim().toLowerCase())
  );
  const total = matches.reduce((sum, row) => sum + row.abs_amount, 0);
  const ratio = totalIncome ? (total / totalIncome) * 100 : 0;
  const categories = [...new Set(matches.map((row) => row.category))].slice(0, 5);

  return `Non-essential categories (restaurants, cafes, entertainment, shopping, subscriptions, travel, etc.) total ${formatMoney(total)} — ${ratio.toFixed(1)}% of income. Matched: ${categories.join(", ") || "none"}. Score ${score}/100.`;
}

function scoreIncomeStability(periods: Record<string, Transaction[]>) {
  const names = Object.keys(periods);
  const incomes = names.map((name) =>
    periods[name]
      .filter((row) => row.transaction_type === "income")
      .reduce((sum, row) => sum + row.abs_amount, 0)
  );

  if (incomes.length <= 1) {
    const latest = periods[names[names.length - 1]];
    const sources = new Set(
      latest.filter((row) => row.transaction_type === "income").map((row) => row.category)
    );
    if (sources.size >= 3) return 90;
    if (sources.size === 2) return 75;
    return 60;
  }

  const avg = mean(incomes);
  if (!avg) return 20;
  const volatility = stdDev(incomes) / avg;
  if (volatility <= 0.05) return 95;
  if (volatility <= 0.15) return 75;
  if (volatility <= 0.3) return 55;
  return 35;
}

function scoreNonEssential(rows: Transaction[], totalIncome: number) {
  if (!totalIncome) return 40;
  const total = rows
    .filter((row) => row.transaction_type === "expense")
    .filter((row) => NON_ESSENTIAL_CATEGORIES.has(row.category.trim().toLowerCase()))
    .reduce((sum, row) => sum + row.abs_amount, 0);
  const ratio = (total / totalIncome) * 100;
  if (ratio <= 8) return 95;
  if (ratio <= 15) return 75;
  if (ratio <= 25) return 55;
  if (ratio <= 35) return 35;
  return 15;
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

function computeIncomeVolatility(periods: Record<string, Transaction[]>) {
  const names = Object.keys(periods);
  const incomes = names.map((name) =>
    periods[name]
      .filter((row) => row.transaction_type === "income")
      .reduce((sum, row) => sum + row.abs_amount, 0)
  );
  if (incomes.length <= 1) return null;
  const avg = mean(incomes);
  return avg ? (stdDev(incomes) / avg) * 100 : null;
}

function computeNonEssentialTotal(rows: Transaction[]) {
  return rows
    .filter((row) => row.transaction_type === "expense")
    .filter((row) => NON_ESSENTIAL_CATEGORIES.has(row.category.trim().toLowerCase()))
    .reduce((sum, row) => sum + row.abs_amount, 0);
}

function computeExpenseVolatility(periods: Record<string, Transaction[]>) {
  const names = Object.keys(periods);
  const expenses = names.map((name) =>
    periods[name]
      .filter((row) => row.transaction_type === "expense")
      .reduce((sum, row) => sum + row.abs_amount, 0)
  );
  if (expenses.length <= 1) return null;
  const avg = mean(expenses);
  return avg ? (stdDev(expenses) / avg) * 100 : null;
}

export function calculateHealthScore(periods: Record<string, Transaction[]>): HealthScore {
  const names = Object.keys(periods);
  const latest = periods[names[names.length - 1]];
  const totalIncome = latest
    .filter((row) => row.transaction_type === "income")
    .reduce((sum, row) => sum + row.abs_amount, 0);
  const totalExpenses = latest
    .filter((row) => row.transaction_type === "expense")
    .reduce((sum, row) => sum + row.abs_amount, 0);
  const savingsRate = totalIncome ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0;
  const nonEssentialTotal = computeNonEssentialTotal(latest);
  const nonEssentialPct = totalIncome ? (nonEssentialTotal / totalIncome) * 100 : 0;
  const incomeSources = new Set(
    latest.filter((row) => row.transaction_type === "income").map((row) => row.category)
  );
  const expenseCategories = latest
    .filter((row) => row.transaction_type === "expense")
    .reduce<Record<string, number>>((acc, row) => {
      acc[row.category] = (acc[row.category] ?? 0) + row.abs_amount;
      return acc;
    }, {});
  const largestExpense = Object.entries(expenseCategories).sort((a, b) => b[1] - a[1])[0];

  const savings_rate_score = scoreSavingsRate(savingsRate);
  const income_stability_score = scoreIncomeStability(periods);
  const non_essential_score = scoreNonEssential(latest, totalIncome);
  const overall = Math.round(
    savings_rate_score * 0.4 + income_stability_score * 0.3 + non_essential_score * 0.3
  );

  return {
    overall,
    savings_rate_score,
    income_stability_score,
    non_essential_score,
    summary: healthSummary(overall),
    details: [
      `Savings rate: ${savingsRate.toFixed(1)}% of income kept after expenses (score ${savings_rate_score}/100).`,
      incomeStabilityDetail(periods, income_stability_score),
      nonEssentialDetail(latest, totalIncome, non_essential_score),
    ],
    metrics: {
      savings_rate_pct: savingsRate,
      total_income: totalIncome,
      total_expenses: totalExpenses,
      net_savings: totalIncome - totalExpenses,
      non_essential_pct: nonEssentialPct,
      non_essential_total: nonEssentialTotal,
      income_source_count: incomeSources.size,
      period_count: names.length,
      income_volatility_pct: computeIncomeVolatility(periods),
      expense_to_income_ratio: totalIncome ? (totalExpenses / totalIncome) * 100 : 0,
      largest_expense_category: largestExpense?.[0] ?? "—",
      largest_expense_amount: largestExpense?.[1] ?? 0,
      essential_expense_pct:
        totalExpenses > 0
          ? ((totalExpenses - nonEssentialTotal) / totalExpenses) * 100
          : 0,
      avg_daily_spend: totalExpenses / 30,
      non_essential_of_expenses_pct:
        totalExpenses > 0 ? (nonEssentialTotal / totalExpenses) * 100 : 0,
      expense_volatility_pct: computeExpenseVolatility(periods),
    },
  };
}

export const HEALTH_SCORE_METHODOLOGY = {
  income_stability:
    "With multiple periods, we measure how much total income swings month to month (standard deviation divided by average income). With one period, we score based on how many distinct income sources you have.",
  non_essential:
    "We total spending in discretionary categories — restaurants, cafes, fast food, entertainment, shopping, subscriptions, travel, and similar — then divide by your income. Lower ratios score higher.",
};
