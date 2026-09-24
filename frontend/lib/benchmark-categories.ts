import { formatCategoryDisplayName } from "@/lib/category-icons";
import { canonicalExpenseCategory } from "@/lib/category-normalize";
import { CATEGORY_ALIASES } from "@/lib/constants";
import { LocationCompareResult } from "@/lib/types";
import { round2 } from "@/lib/utils";

export const BENCHMARK_CATEGORIES = [
  { key: "rent", label: "Rent" },
  { key: "groceries", label: "Groceries" },
  { key: "restaurants", label: "Restaurants" },
  { key: "transport", label: "Transport" },
  { key: "gas", label: "Gas & fuel" },
  { key: "utilities", label: "Utilities" },
  { key: "entertainment", label: "Entertainment" },
] as const;

export type BenchmarkCategoryKey = (typeof BENCHMARK_CATEGORIES)[number]["key"];

const BENCHMARK_KEYS = new Set<string>(BENCHMARK_CATEGORIES.map((category) => category.key));

export function benchmarkCategoryLabel(key: string): string {
  const normalized = key.trim().toLowerCase();
  const entry = BENCHMARK_CATEGORIES.find((category) => category.key === normalized);
  return entry?.label ?? formatCategoryDisplayName(key);
}

export function benchmarkKeyFromComparisonLabel(
  categoryLabel: string
): BenchmarkCategoryKey | null {
  const normalized = categoryLabel.trim().toLowerCase();
  const byKey = BENCHMARK_CATEGORIES.find((category) => category.key === normalized);
  if (byKey) return byKey.key;
  const byLabel = BENCHMARK_CATEGORIES.find(
    (category) => category.label.trim().toLowerCase() === normalized
  );
  return byLabel?.key ?? null;
}

/** Sum of benchmark-category spending — matches the "Your spending" total in the category matrix. */
export function totalBenchmarkCategorySpending(spending: Record<string, number>) {
  return BENCHMARK_CATEGORIES.reduce(
    (sum, category) => sum + (spending[category.key] ?? 0),
    0
  );
}

/** Totals for every expense category present in uploaded statements (canonical names). */
export function uploadedExpenseCategoryTotals(
  expenseCategories: { category: string; total: number }[]
): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const item of expenseCategories) {
    if (item.total <= 0) continue;
    const canonical = canonicalExpenseCategory(item.category);
    totals[canonical] = round2((totals[canonical] ?? 0) + item.total);
  }
  return totals;
}

/** Map an uploaded expense category to a WhereNext price benchmark for ratio lookup. */
export function expenseCategoryToBenchmarkKey(category: string): BenchmarkCategoryKey | null {
  const lower = category.trim().toLowerCase();
  const alias = CATEGORY_ALIASES[lower];
  if (alias) {
    if (alias === "mortgage") return "rent";
    if (alias === "car payment" || alias === "public transit") return "transport";
    if (alias === "internet" || alias === "mobile phone" || alias === "phone") return "utilities";
    if (alias === "gym membership" || alias === "hobbies") return "entertainment";
    if (alias === "medications" || alias === "loan payment") return null;
    if (BENCHMARK_KEYS.has(alias)) return alias as BenchmarkCategoryKey;
    return null;
  }

  const canonicalMap: Record<string, BenchmarkCategoryKey> = {
    rent: "rent",
    groceries: "groceries",
    restaurants: "restaurants",
    transport: "transport",
    utilities: "utilities",
    entertainment: "entertainment",
    "mortgage payment": "rent",
    gas: "gas",
    "gas & fuel": "gas",
    subscriptions: "entertainment",
    shopping: "entertainment",
    internet: "utilities",
    alcohol: "restaurants",
    education: "entertainment",
    travel: "entertainment",
    "car payment": "transport",
    "public transit": "transport",
    "gym membership": "entertainment",
    hobbies: "entertainment",
    "discount retail": "groceries",
    "general merchandise": "entertainment",
  };

  return canonicalMap[lower] ?? null;
}

export type CategoryPriceAdjustment = {
  category: string;
  userAmount: number;
  benchmarkKey: string | null;
  priceRatio: number;
  adjustedAmount: number;
  usedFallbackRatio: boolean;
};

function benchmarkReferenceAmount(
  result: LocationCompareResult,
  benchmarkKey: string,
  lifestyleMultiplier: number
) {
  const base = result.reference_benchmarks[benchmarkKey] ?? 0;
  return round2(base * result.household_size * lifestyleMultiplier);
}

function overallPriceLevelRatio(
  homeResult: LocationCompareResult,
  destinationResult: LocationCompareResult,
  lifestyleMultiplier: number
) {
  if (homeResult.reference_monthly_total <= 0) return 1;
  return (
    (destinationResult.reference_monthly_total * lifestyleMultiplier) /
    homeResult.reference_monthly_total
  );
}

function categoryPriceRatio(
  homeResult: LocationCompareResult,
  destinationResult: LocationCompareResult,
  benchmarkKey: string,
  lifestyleMultiplier: number
): number | null {
  const homeRef = benchmarkReferenceAmount(homeResult, benchmarkKey, 1);
  const destRef = benchmarkReferenceAmount(destinationResult, benchmarkKey, lifestyleMultiplier);
  if (homeRef <= 0 || destRef <= 0) return null;
  return destRef / homeRef;
}

/**
 * Scale each uploaded expense category from home to destination price levels.
 * Uses per-category WhereNext reference ratios (not exchange rates or purchasing power).
 * Categories without a direct benchmark use the overall city price-level ratio as fallback.
 */
export function computeUserExpensesAtDestinationPrices(
  destinationResult: LocationCompareResult,
  homeResult: LocationCompareResult,
  userCategoryTotals: Record<string, number>,
  lifestyleMultiplier = 1
): { total: number; breakdown: CategoryPriceAdjustment[] } {
  const fallbackRatio = overallPriceLevelRatio(
    homeResult,
    destinationResult,
    lifestyleMultiplier
  );
  const breakdown: CategoryPriceAdjustment[] = [];
  let total = 0;

  for (const [category, userAmount] of Object.entries(userCategoryTotals)) {
    if (userAmount <= 0) continue;

    const benchmarkKey = expenseCategoryToBenchmarkKey(category);
    const specificRatio =
      benchmarkKey !== null
        ? categoryPriceRatio(homeResult, destinationResult, benchmarkKey, lifestyleMultiplier)
        : null;
    const priceRatio = specificRatio ?? fallbackRatio;
    const usedFallbackRatio = specificRatio === null;
    const adjustedAmount = round2(userAmount * priceRatio);

    breakdown.push({
      category,
      userAmount: round2(userAmount),
      benchmarkKey,
      priceRatio: round2(priceRatio),
      adjustedAmount,
      usedFallbackRatio,
    });
    total += adjustedAmount;
  }

  breakdown.sort((a, b) => b.adjustedAmount - a.adjustedAmount);

  return { total: round2(total), breakdown };
}

/** Sum of uploaded expense categories (no destination adjustment). */
export function totalUploadedExpenseCategories(userCategoryTotals: Record<string, number>) {
  return round2(
    Object.values(userCategoryTotals).reduce((sum, amount) => sum + (amount > 0 ? amount : 0), 0)
  );
}
