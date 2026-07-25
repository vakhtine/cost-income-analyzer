import { AnalyzeResponse, Transaction } from "@/lib/types";

export function periodTotalIncome(rows: Transaction[]) {
  return rows
    .filter((row) => row.transaction_type === "income")
    .reduce((sum, row) => sum + row.abs_amount, 0);
}

export function findRelocatePeriod(data: AnalyzeResponse, preferred?: string) {
  if (
    preferred &&
    data.periods.includes(preferred) &&
    periodTotalIncome(data.period_rows[preferred] ?? []) > 0
  ) {
    return preferred;
  }

  for (let index = data.periods.length - 1; index >= 0; index -= 1) {
    const period = data.periods[index];
    if (periodTotalIncome(data.period_rows[period] ?? []) > 0) {
      return period;
    }
  }

  if (preferred && data.periods.includes(preferred)) {
    return preferred;
  }

  return data.periods[data.periods.length - 1] ?? preferred ?? "";
}
