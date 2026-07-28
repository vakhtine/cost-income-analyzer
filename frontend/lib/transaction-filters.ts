import { canonicalCategoryName } from "@/lib/category-normalize";
import { isTransferCategory, resolveTransactionType } from "@/lib/constants";
import { Transaction } from "@/lib/types";

export function isTransferTransaction(row: Transaction): boolean {
  return row.transaction_type === "transfer" || isTransferCategory(row.category);
}

export function isExpenseTransaction(row: Transaction): boolean {
  if (isTransferTransaction(row)) return false;
  return row.transaction_type === "expense";
}

export function isIncomeTransaction(row: Transaction): boolean {
  if (isTransferTransaction(row)) return false;
  return row.transaction_type === "income";
}

export function normalizeTransaction(row: Transaction): Transaction {
  const transaction_type = resolveTransactionType(row.category);
  const category = canonicalCategoryName(row.category, transaction_type);
  return {
    ...row,
    category,
    transaction_type,
    abs_amount: Math.abs(row.amount),
  };
}

export function normalizePeriodRows(
  periodRows: Record<string, Transaction[]>
): Record<string, Transaction[]> {
  const next: Record<string, Transaction[]> = {};
  for (const [period, rows] of Object.entries(periodRows)) {
    next[period] = rows.map(normalizeTransaction);
  }
  return next;
}

export function filterExpenseTransactions(rows: Transaction[]): Transaction[] {
  return rows.filter(isExpenseTransaction);
}

export function filterIncomeTransactions(rows: Transaction[]): Transaction[] {
  return rows.filter(isIncomeTransaction);
}

export function sumExpenseAmount(rows: Transaction[]): number {
  return filterExpenseTransactions(rows).reduce((sum, row) => sum + row.abs_amount, 0);
}

export function sumIncomeAmount(rows: Transaction[]): number {
  return filterIncomeTransactions(rows).reduce((sum, row) => sum + row.abs_amount, 0);
}

export function periodHasReportableData(rows: Transaction[]): boolean {
  return (
    filterIncomeTransactions(rows).length > 0 || filterExpenseTransactions(rows).length > 0
  );
}
