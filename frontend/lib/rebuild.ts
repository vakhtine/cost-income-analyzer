import { analyzeTransactions } from "@/lib/analyzer";
import { buildPeriodAdvice, detectCategorizationIssues } from "@/lib/advisor";
import { calculateHealthScore } from "@/lib/health-score";
import { comparePeriods } from "@/lib/period-analyzer";
import { AnalyzeResponse, Transaction } from "@/lib/types";

export const AVERAGE_PERIOD_LABEL = "__average__";

export function analyzeAveragePeriods(period_rows: Record<string, Transaction[]>) {
  const names = Object.keys(period_rows);
  if (names.length <= 1) {
    return analyzeTransactions(period_rows[names[0]] ?? []);
  }

  const combined = analyzeCombinedPeriods(period_rows);
  const count = names.length;
  const avgIncome = combined.total_income / count;
  const avgExpenses = combined.total_expenses / count;

  return {
    ...combined,
    total_income: avgIncome,
    total_expenses: avgExpenses,
    net_savings: avgIncome - avgExpenses,
    savings_rate: avgIncome ? ((avgIncome - avgExpenses) / avgIncome) * 100 : 0,
    income_categories: combined.income_categories.map((item) => ({
      ...item,
      total: item.total / count,
    })),
    expense_categories: combined.expense_categories.map((item) => ({
      ...item,
      total: item.total / count,
    })),
  };
}

export function buildAveragePeriodRows(period_rows: Record<string, Transaction[]>): Transaction[] {
  const names = Object.keys(period_rows);
  if (names.length <= 1) {
    return period_rows[names[0]] ?? [];
  }

  const analysis = analyzeCombinedPeriods(period_rows);
  const count = names.length;
  const rows: Transaction[] = [];
  let id = 0;

  for (const item of analysis.expense_categories) {
    rows.push({
      id: id++,
      merchant_name: `Average ${item.category}`,
      category: item.category,
      amount: item.total / count,
      period: AVERAGE_PERIOD_LABEL,
      transaction_type: "expense",
      abs_amount: item.total / count,
    });
  }

  for (const item of analysis.income_categories) {
    rows.push({
      id: id++,
      merchant_name: `Average ${item.category}`,
      category: item.category,
      amount: item.total / count,
      period: AVERAGE_PERIOD_LABEL,
      transaction_type: "income",
      abs_amount: item.total / count,
    });
  }

  return rows;
}

export function rebuildAnalyzeResponse(
  period_rows: Record<string, Transaction[]>
): AnalyzeResponse {
  const periodNames = Object.keys(period_rows);
  const period_analysis: AnalyzeResponse["period_analysis"] = {};
  for (const name of periodNames) {
    period_analysis[name] = analyzeTransactions(period_rows[name]);
  }

  let comparison = null;
  if (periodNames.length >= 2) {
    const previous = periodNames[periodNames.length - 2];
    const current = periodNames[periodNames.length - 1];
    comparison = comparePeriods(
      period_rows[previous],
      period_rows[current],
      previous,
      current
    );
  }

  return {
    periods: periodNames,
    period_analysis,
    period_rows,
    comparison,
    health_score: calculateHealthScore(period_rows),
    categorization_flags: detectCategorizationIssues(period_rows),
    advisor_notes: buildPeriodAdvice(period_rows, comparison),
    privacy_notice:
      "Your file was analyzed only in this browser session. Nothing was uploaded to a server.",
  };
}

export function combineAllPeriodRows(period_rows: Record<string, Transaction[]>) {
  return Object.values(period_rows).flat();
}

export function analyzeCombinedPeriods(period_rows: Record<string, Transaction[]>) {
  return analyzeTransactions(combineAllPeriodRows(period_rows));
}
