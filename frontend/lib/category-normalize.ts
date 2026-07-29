const EXPENSE_CATEGORY_CANONICAL: Record<string, string> = {
  grocery: "Groceries",
  groceries: "Groceries",
  restaurant: "Restaurants",
  restaurants: "Restaurants",
  dining: "Restaurants",
  cafe: "Restaurants",
  cafes: "Restaurants",
  mortgage: "Mortgage payment",
  "mortgage payment": "Mortgage payment",
  "mortgage payments": "Mortgage payment",
  utility: "Utilities",
  utilities: "Utilities",
  subscription: "Subscriptions",
  subscriptions: "Subscriptions",
  transport: "Transport",
  transportation: "Transport",
  insurance: "Insurance",
  entertainment: "Entertainment",
};

export function canonicalExpenseCategory(category: string): string {
  const trimmed = category.trim();
  if (!trimmed) return trimmed;
  const key = trimmed.toLowerCase();
  if (EXPENSE_CATEGORY_CANONICAL[key]) return EXPENSE_CATEGORY_CANONICAL[key];
  if (key === "grocery" || key.startsWith("grocer")) return "Groceries";
  if (key === "restaurant" || key.startsWith("restaurant")) return "Restaurants";
  if (key.includes("mortgage")) return "Mortgage payment";
  return trimmed;
}

export function canonicalCategoryName(
  category: string,
  transactionType: "income" | "expense" | "transfer"
): string {
  if (transactionType === "transfer") return category.trim();
  if (transactionType === "income") return category.trim();
  return canonicalExpenseCategory(category);
}
