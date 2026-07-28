import { canonicalExpenseCategory } from "@/lib/category-normalize";
import { filterExpenseTransactions } from "@/lib/transaction-filters";
import { Transaction } from "@/lib/types";

export function topMerchantsByCategory(
  rows: Transaction[],
  category: string,
  limit = 3
): string[] {
  const canonical = canonicalExpenseCategory(category);
  const merchants = new Map<string, number>();

  for (const row of filterExpenseTransactions(rows)) {
    if (canonicalExpenseCategory(row.category) !== canonical) continue;
    merchants.set(row.merchant_name, (merchants.get(row.merchant_name) ?? 0) + row.abs_amount);
  }

  return [...merchants.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name]) => name);
}

export function topMerchantsByCategoryMap(
  rows: Transaction[],
  limit = 3
): Map<string, string[]> {
  const categories = new Set<string>();
  for (const row of filterExpenseTransactions(rows)) {
    categories.add(canonicalExpenseCategory(row.category));
  }

  const map = new Map<string, string[]>();
  for (const category of categories) {
    map.set(category, topMerchantsByCategory(rows, category, limit));
  }
  return map;
}
