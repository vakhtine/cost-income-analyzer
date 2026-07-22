import { isTransferCategory, INCOME_CATEGORIES, MERCHANT_CATEGORY_HINTS } from "@/lib/constants";
import { calculateHealthScore } from "@/lib/health-score";
import { comparePeriods, explainCategoryChange } from "@/lib/period-analyzer";
import { CategorizationFlag, PeriodComparison, Transaction } from "@/lib/types";

function suggestedCategory(merchantLower: string) {
  for (const [keyword, category] of Object.entries(MERCHANT_CATEGORY_HINTS)) {
    if (merchantLower.includes(keyword)) return category;
  }
  return null;
}

export function detectCategorizationIssues(periods: Record<string, Transaction[]>) {
  const flags: CategorizationFlag[] = [];
  for (const [periodName, rows] of Object.entries(periods)) {
    for (const row of rows) {
      const merchantLower = row.merchant_name.toLowerCase();
      const categoryLower = row.category.trim().toLowerCase();

      if (row.transaction_type === "transfer" || isTransferCategory(row.category)) {
        continue;
      }

      const suggested = suggestedCategory(merchantLower);

      if (categoryLower === "unknown" && suggested) {
        flags.push({
          row_id: row.id,
          period: periodName,
          merchant_name: row.merchant_name,
          current_category: row.category,
          suggested_category: suggested,
          reason: "Merchant usually fits another category.",
          amount: row.abs_amount,
        });
        continue;
      }

      if (suggested && categoryLower !== suggested.toLowerCase() && !INCOME_CATEGORIES.has(categoryLower)) {
        flags.push({
          row_id: row.id,
          period: periodName,
          merchant_name: row.merchant_name,
          current_category: row.category,
          suggested_category: suggested,
          reason: `${row.merchant_name} is categorized as ${row.category}, but often maps to ${suggested}.`,
          amount: row.abs_amount,
        });
        continue;
      }

      if (row.transaction_type === "income" && !INCOME_CATEGORIES.has(categoryLower)) {
        flags.push({
          row_id: row.id,
          period: periodName,
          merchant_name: row.merchant_name,
          current_category: row.category,
          suggested_category: row.category,
          reason: "This looks like an expense merchant tagged with an unusual income category.",
          amount: row.abs_amount,
        });
      }

      if (row.transaction_type === "expense" && INCOME_CATEGORIES.has(categoryLower)) {
        flags.push({
          row_id: row.id,
          period: periodName,
          merchant_name: row.merchant_name,
          current_category: row.category,
          suggested_category: "Shopping",
          reason: "This merchant is tagged as income but looks like spending.",
          amount: row.abs_amount,
        });
      }
    }
  }
  return flags.slice(0, 20);
}

export function buildPeriodAdvice(
  periods: Record<string, Transaction[]>,
  comparison: PeriodComparison | null
) {
  const advice: string[] = [];
  const health = calculateHealthScore(periods);
  advice.push(`Financial health score: ${health.overall}/100 — ${health.summary}.`);
  advice.push(...health.details);

  if (!comparison) {
    const latest = Object.keys(periods).at(-1)!;
    advice.push(`Single-period upload detected for ${latest}. Upload multiple tabs to compare months.`);
    return advice;
  }

  advice.push(
    `Income changed by $${comparison.income_change.toFixed(2)} (${comparison.income_change_pct >= 0 ? "+" : ""}${comparison.income_change_pct.toFixed(1)}%) between ${comparison.previous_period} and ${comparison.current_period}.`
  );
  advice.push(
    `Expenses changed by $${comparison.expense_change.toFixed(2)} (${comparison.expense_change_pct >= 0 ? "+" : ""}${comparison.expense_change_pct.toFixed(1)}%) over the same period.`
  );
  for (const change of comparison.category_changes.slice(0, 8)) {
    advice.push(explainCategoryChange(change));
  }
  return advice;
}
