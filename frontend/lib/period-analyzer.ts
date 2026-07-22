import { analyzeTransactions } from "@/lib/analyzer";
import { CategoryChange, CategoryDriver, PeriodComparison, Transaction } from "@/lib/types";
import { pctChange, round2 } from "@/lib/utils";

function categoryTotals(rows: Transaction[]) {
  const map = new Map<string, number>();
  for (const row of rows) {
    const key = `${row.transaction_type}::${row.category}`;
    map.set(key, (map.get(key) ?? 0) + row.abs_amount);
  }
  return map;
}

function filterCategoryRows(
  rows: Transaction[],
  transactionType: Transaction["transaction_type"],
  category: string
) {
  return rows.filter(
    (row) => row.transaction_type === transactionType && row.category === category
  );
}

function largestTransaction(rows: Transaction[], merchantName: string) {
  return rows
    .filter((row) => row.merchant_name === merchantName)
    .sort((a, b) => b.abs_amount - a.abs_amount)[0];
}

function merchantDeltas(
  previousRows: Transaction[],
  currentRows: Transaction[],
  transactionType: Transaction["transaction_type"],
  category: string
) {
  const totals = (rows: Transaction[]) => {
    const map = new Map<string, number>();
    for (const row of filterCategoryRows(rows, transactionType, category)) {
      map.set(row.merchant_name, (map.get(row.merchant_name) ?? 0) + row.abs_amount);
    }
    return map;
  };

  const previous = totals(previousRows);
  const current = totals(currentRows);
  const merchants = new Set([...previous.keys(), ...current.keys()]);
  const deltas: [string, number][] = [];

  for (const merchant of merchants) {
    const delta = (current.get(merchant) ?? 0) - (previous.get(merchant) ?? 0);
    if (Math.abs(delta) > 0.01) deltas.push([merchant, round2(delta)]);
  }

  return deltas.sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
}

function categoryChangeDrivers(
  previousRows: Transaction[],
  currentRows: Transaction[],
  transactionType: Transaction["transaction_type"],
  category: string,
  changeAmount: number
): CategoryDriver[] {
  const isIncrease = changeAmount > 0;
  const focusRows = isIncrease ? currentRows : previousRows;
  const categoryRows = filterCategoryRows(focusRows, transactionType, category);
  const deltas = merchantDeltas(previousRows, currentRows, transactionType, category);

  const alignedDeltas = deltas
    .filter(([, delta]) => (isIncrease ? delta > 0 : delta < 0))
    .slice(0, 3);

  if (alignedDeltas.length) {
    return alignedDeltas.map(([merchant, delta]) => {
      const transaction = largestTransaction(categoryRows, merchant);
      return {
        merchant_name: merchant,
        delta,
        transaction_amount: round2(transaction?.abs_amount ?? Math.abs(delta)),
      };
    });
  }

  return categoryRows
    .sort((a, b) => b.abs_amount - a.abs_amount)
    .slice(0, 3)
    .map((row) => ({
      merchant_name: row.merchant_name,
      delta: round2(isIncrease ? row.abs_amount : -row.abs_amount),
      transaction_amount: round2(row.abs_amount),
    }));
}

function buildCategoryChanges(previousRows: Transaction[], currentRows: Transaction[]) {
  const previousTotals = categoryTotals(previousRows);
  const currentTotals = categoryTotals(currentRows);
  const keys = new Set([...previousTotals.keys(), ...currentTotals.keys()]);
  const changes: CategoryChange[] = [];

  for (const key of [...keys].sort()) {
    const [transaction_type, category] = key.split("::") as [
      Transaction["transaction_type"],
      string,
    ];
    const previous_total = previousTotals.get(key) ?? 0;
    const current_total = currentTotals.get(key) ?? 0;
    const change_amount = round2(current_total - previous_total);
    if (Math.abs(change_amount) < 0.01) continue;
    changes.push({
      category,
      transaction_type,
      previous_total: round2(previous_total),
      current_total: round2(current_total),
      change_amount,
      change_pct: round2(pctChange(previous_total, current_total)),
      top_drivers: categoryChangeDrivers(
        previousRows,
        currentRows,
        transaction_type,
        category,
        change_amount
      ),
    });
  }

  return changes.sort((a, b) => Math.abs(b.change_amount) - Math.abs(a.change_amount));
}

export function comparePeriods(
  previousRows: Transaction[],
  currentRows: Transaction[],
  previousName: string,
  currentName: string
): PeriodComparison {
  const previous = analyzeTransactions(previousRows);
  const current = analyzeTransactions(currentRows);
  return {
    previous_period: previousName,
    current_period: currentName,
    income_change: round2(current.total_income - previous.total_income),
    income_change_pct: round2(pctChange(previous.total_income, current.total_income)),
    expense_change: round2(current.total_expenses - previous.total_expenses),
    expense_change_pct: round2(pctChange(previous.total_expenses, current.total_expenses)),
    category_changes: buildCategoryChanges(previousRows, currentRows),
  };
}

export function explainCategoryChange(change: CategoryChange) {
  const direction = change.change_amount > 0 ? "increased" : "decreased";
  let text = `${change.category} (${change.transaction_type}) ${direction} by $${Math.abs(change.change_amount).toFixed(2)} (${change.change_pct >= 0 ? "+" : ""}${change.change_pct.toFixed(1)}%) from $${change.previous_total.toFixed(2)} to $${change.current_total.toFixed(2)}.`;

  if (change.top_drivers.length) {
    const bits = change.top_drivers.slice(0, 3).map(
      (driver, index) =>
        `${index + 1}. ${driver.merchant_name} (${driver.delta >= 0 ? "+" : "-"}$${Math.abs(driver.delta).toFixed(2)}, largest txn $${driver.transaction_amount.toFixed(2)})`
    );
    text += ` Primary explanation: ${bits.join("; ")}.`;
  } else {
    text += " No dominant merchants or transactions explained this change.";
  }

  return text;
}
