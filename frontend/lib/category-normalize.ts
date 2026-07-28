const EXPENSE_CATEGORY_CANONICAL: Record<string, string> = {
  grocery: "Groceries",
  groceries: "Groceries",
  mortgage: "Mortgage payment",
  "mortgage payment": "Mortgage payment",
  "mortgage payments": "Mortgage payment",
};

export function canonicalExpenseCategory(category: string): string {
  const trimmed = category.trim();
  const key = trimmed.toLowerCase();
  if (EXPENSE_CATEGORY_CANONICAL[key]) return EXPENSE_CATEGORY_CANONICAL[key];
  if (key === "grocery" || key.startsWith("grocer")) return "Groceries";
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
