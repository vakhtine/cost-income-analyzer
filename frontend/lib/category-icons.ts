export type CategoryIconId =
  | "grocery"
  | "gas-fuel"
  | "telecom"
  | "insurance"
  | "shopping"
  | "discount-retail"
  | "wire-transfer"
  | "uncategorized"
  | "dining"
  | "transport"
  | "rent"
  | "utilities"
  | "health"
  | "entertainment"
  | "travel"
  | "education"
  | "income"
  | "default";

export type CategoryMeta = {
  iconId: CategoryIconId;
  tone: string;
  /** Short symbol for PDF / plain-text exports */
  symbol: string;
};

function normalizeCategory(category: string) {
  return category.trim().toLowerCase();
}

export function formatCategoryDisplayName(category: string): string {
  const key = normalizeCategory(category);
  if (key.includes("telecommunication")) return "Telecom";
  return category;
}

export function getCategoryMeta(category: string): CategoryMeta {
  const key = normalizeCategory(category);

  if (key.includes("uncategor") || key === "unknown") {
    return { iconId: "uncategorized", tone: "cat-uncategorized", symbol: "◎" };
  }
  if (key.includes("wire transfer") || key === "transfer" || key.includes("internal transfer")) {
    return { iconId: "wire-transfer", tone: "cat-transfer", symbol: "↔" };
  }
  if (key.includes("discount") && key.includes("retail")) {
    return { iconId: "discount-retail", tone: "cat-discount-retail", symbol: "%" };
  }
  if (key.includes("gas") && key.includes("fuel")) {
    return { iconId: "gas-fuel", tone: "cat-gas-fuel", symbol: "⛽" };
  }
  if (
    key.includes("telecom") ||
    key.includes("phone") ||
    key.includes("mobile") ||
    key.includes("internet") ||
    key.includes("cell")
  ) {
    return { iconId: "telecom", tone: "cat-telecom", symbol: "📋" };
  }
  if (key.includes("grocer") || key.includes("food market") || key.includes("supermarket") || key === "grocery") {
    return { iconId: "grocery", tone: "cat-groceries", symbol: "🥑" };
  }
  if (key.includes("insurance")) {
    return { iconId: "insurance", tone: "cat-insurance", symbol: "🛡" };
  }
  if (key.includes("shop") || key.includes("retail") || key.includes("clothing")) {
    return { iconId: "shopping", tone: "cat-shopping", symbol: "🛍" };
  }
  if (
    key.includes("entertain") ||
    key.includes("subscription") ||
    key.includes("streaming")
  ) {
    return { iconId: "entertainment", tone: "cat-entertainment", symbol: "▶" };
  }
  if (
    key.includes("date") ||
    key.includes("dining") ||
    key.includes("restaurant") ||
    key.includes("night out") ||
    key.includes("cafe") ||
    key.includes("coffee")
  ) {
    return { iconId: "dining", tone: "cat-dining", symbol: "🍽" };
  }
  if (
    key.includes("transport") ||
    key.includes("transit") ||
    key.includes("lyft") ||
    key.includes("uber")
  ) {
    return { iconId: "transport", tone: "cat-transport", symbol: "🚌" };
  }
  if (key.includes("fuel") || key.includes("gas station") || key.includes("petrol")) {
    return { iconId: "gas-fuel", tone: "cat-gas-fuel", symbol: "⛽" };
  }
  if (key.includes("rent") || key.includes("housing") || key.includes("mortgage")) {
    return { iconId: "rent", tone: "cat-rent", symbol: "🏠" };
  }
  if (key.includes("utilit") || key.includes("electric")) {
    return { iconId: "utilities", tone: "cat-utilities", symbol: "⚡" };
  }
  if (key.includes("health") || key.includes("medical") || key.includes("pharmacy") || key.includes("healthcare")) {
    return { iconId: "health", tone: "cat-health", symbol: "✚" };
  }
  if (key.includes("travel") || key.includes("flight") || key.includes("hotel")) {
    return { iconId: "travel", tone: "cat-travel", symbol: "✈" };
  }
  if (key.includes("education") || key.includes("school") || key.includes("tuition")) {
    return { iconId: "education", tone: "cat-education", symbol: "🎓" };
  }
  if (
    key.includes("salary") ||
    key.includes("pension") ||
    key.includes("income") ||
    key.includes("bonus") ||
    key.includes("payroll")
  ) {
    return { iconId: "income", tone: "cat-income", symbol: "$" };
  }

  return { iconId: "default", tone: "cat-default", symbol: "●" };
}

const PDF_SYMBOLS: Record<CategoryIconId, string> = {
  grocery: "🥑",
  "gas-fuel": "⛽",
  telecom: "📱",
  insurance: "🛡",
  shopping: "🛍",
  "discount-retail": "%",
  "wire-transfer": "↔",
  uncategorized: "◎",
  dining: "🍽",
  transport: "🚌",
  rent: "🏠",
  utilities: "⚡",
  health: "✚",
  entertainment: "▶",
  travel: "✈",
  education: "🎓",
  income: "$",
  default: "●",
};

export function getCategoryPdfSymbol(category: string): string {
  const { iconId, symbol } = getCategoryMeta(category);
  return PDF_SYMBOLS[iconId] ?? symbol;
}
