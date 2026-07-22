import {
  DEFAULT_EXPENSE_CATEGORIES,
  RawRow,
  resolveTransactionType,
  TRANSFER_CATEGORY_LABEL,
} from "@/lib/constants";
import { classifyTransactions } from "@/lib/parser";
import { CategorizationFlag, Transaction } from "@/lib/types";

export function isUnknownCategory(category: string) {
  return category.trim().toLowerCase() === "unknown";
}

export function getKnownExpenseCategories(rows: Transaction[]) {
  const categories = new Set<string>();
  for (const row of rows) {
    if (row.transaction_type === "expense" && !isUnknownCategory(row.category)) {
      categories.add(row.category);
    }
  }
  return [...categories].sort();
}

export function getAllUsedCategories(rows: Transaction[]) {
  const categories = new Set<string>(DEFAULT_EXPENSE_CATEGORIES);
  categories.add(TRANSFER_CATEGORY_LABEL);
  for (const row of rows) {
    const category = row.category.trim();
    if (category && !isUnknownCategory(category)) {
      categories.add(category);
    }
  }
  return [...categories].sort((a, b) => a.localeCompare(b));
}

export function getMerchantCategoryOptions(rows: Transaction[]) {
  const options = new Set(getAllUsedCategories(rows));
  options.add(TRANSFER_CATEGORY_LABEL);
  return [...options].sort((a, b) => a.localeCompare(b));
}

export function getUnknownMerchants(rows: Transaction[]) {
  const totals = new Map<string, number>();
  for (const row of rows) {
    if (row.transaction_type === "expense" && isUnknownCategory(row.category)) {
      totals.set(row.merchant_name, (totals.get(row.merchant_name) ?? 0) + row.abs_amount);
    }
  }
  return [...totals.entries()]
    .map(([merchant_name, total]) => ({ merchant_name, total }))
    .sort((a, b) => b.total - a.total);
}

export function applyUnknownAssignments(
  rows: Transaction[],
  assignments: Record<string, string>
) {
  return rows.map((row) => {
    if (
      row.transaction_type === "expense" &&
      isUnknownCategory(row.category) &&
      assignments[row.merchant_name]
    ) {
      const category = assignments[row.merchant_name];
      const transaction_type = resolveTransactionType(category);
      return {
        ...row,
        category,
        transaction_type,
      };
    }
    return row;
  });
}

export function applyFlagFixes(
  period_rows: Record<string, Transaction[]>,
  fixes: { period: string; row_id: number; merchant_name: string; category: string }[]
) {
  const updated: Record<string, Transaction[]> = {};
  for (const [period, rows] of Object.entries(period_rows)) {
    updated[period] = rows.map((row) => {
      const fix =
        fixes.find((item) => item.period === period && item.row_id === row.id) ??
        fixes.find(
          (item) =>
            item.period === period &&
            item.merchant_name.toLowerCase() === row.merchant_name.toLowerCase()
        );
      if (!fix) return row;
      const transaction_type = resolveTransactionType(fix.category);
      return {
        ...row,
        category: fix.category,
        transaction_type,
      };
    });
  }
  return updated;
}

export function rowsToEditable(rows: Transaction[]) {
  return rows.map((row) => ({
    id: row.id,
    merchant_name: row.merchant_name,
    category: row.category,
    amount: row.amount,
    date: row.date ?? "",
  }));
}

export function editableToTransactions(
  rows: { id: number; merchant_name: string; category: string; amount: number; date?: string }[],
  periodName: string,
  startId = 0
): Transaction[] {
  const raw: RawRow[] = rows
    .filter((row) => row.merchant_name.trim() && row.category.trim() && row.amount !== 0)
    .map((row) => ({
      merchant_name: row.merchant_name.trim(),
      category: row.category.trim(),
      amount: Number(row.amount),
      date: row.date || undefined,
      period: periodName,
    }));
  return classifyTransactions(raw, periodName, startId);
}

export function collectFlagFixes(
  flags: CategorizationFlag[],
  decisions: Record<string, "keep" | "change">
) {
  const fixes: { period: string; row_id: number; merchant_name: string; category: string }[] = [];
  for (const flag of flags) {
    const key = `${flag.period}-${flag.row_id}`;
    if (decisions[key] === "keep") continue;
    if (
      flag.suggested_category.trim().toLowerCase() ===
      flag.current_category.trim().toLowerCase()
    ) {
      continue;
    }
    fixes.push({
      period: flag.period,
      row_id: flag.row_id,
      merchant_name: flag.merchant_name,
      category: flag.suggested_category,
    });
  }
  return fixes;
}

export function collectAllActionableFlagFixes(flags: CategorizationFlag[]) {
  return collectFlagFixes(flags, {});
}
