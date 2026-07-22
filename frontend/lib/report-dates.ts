import { Transaction } from "@/lib/types";

export function getPeriodExpenseDateLabel(
  rows: Transaction[],
  periodLabel: string
): string {
  const expenseDates = rows
    .filter((row) => row.transaction_type === "expense" && row.date)
    .map((row) => row.date as string)
    .sort();

  if (!expenseDates.length) {
    return `Period: ${periodLabel}`;
  }

  const start = expenseDates[0];
  const end = expenseDates[expenseDates.length - 1];
  if (start === end) {
    return `Expenses dated ${start} (${periodLabel})`;
  }
  return `Expenses dated ${start} – ${end} (${periodLabel})`;
}

export function getReportPrivacyNotice(notice: string) {
  return `${notice} Estimates only — not financial advice.`;
}
