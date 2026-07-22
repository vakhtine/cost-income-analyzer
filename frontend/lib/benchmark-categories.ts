export const BENCHMARK_CATEGORIES = [
  { key: "rent", label: "Rent" },
  { key: "groceries", label: "Groceries" },
  { key: "restaurants", label: "Restaurants" },
  { key: "transport", label: "Transport" },
  { key: "utilities", label: "Utilities" },
  { key: "entertainment", label: "Entertainment" },
] as const;

export type BenchmarkCategoryKey = (typeof BENCHMARK_CATEGORIES)[number]["key"];
