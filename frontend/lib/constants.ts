export const INCOME_CATEGORIES = new Set([
  "salary",
  "pension",
  "investment income",
  "investment",
  "dividends",
  "interest",
  "other income",
  "income",
  "rental income",
  "bonus",
]);

export const TRANSFER_CATEGORIES = new Set([
  "transfer",
  "transfers",
  "credit card payment",
  "cc payment",
  "internal transfer",
  "account transfer",
  "wire transfer",
  "bank transfer",
  "e-transfer",
  "etransfer",
  "interac e-transfer",
  "interac",
  "payment transfer",
]);

export const TRANSFER_CATEGORY_LABEL = "Transfer";

export function isTransferCategory(category: string) {
  const normalized = category.trim().toLowerCase();
  if (TRANSFER_CATEGORIES.has(normalized)) return true;
  if (normalized.includes("transfer") && !normalized.includes("transport")) return true;
  return false;
}

export function resolveTransactionType(category: string): "income" | "expense" | "transfer" {
  const categoryLower = category.trim().toLowerCase();
  if (INCOME_CATEGORIES.has(categoryLower)) return "income";
  if (isTransferCategory(category)) return "transfer";
  return "expense";
}

export const DEFAULT_EXPENSE_CATEGORIES = [
  "Rent",
  "Mortgage payment",
  "Groceries",
  "Restaurants",
  "Transport",
  "Public Transit",
  "Utilities",
  "Internet",
  "Subscriptions",
  "Shopping",
  "Healthcare",
  "Medications",
  "Entertainment",
  "Hobbies",
  "Insurance",
  "Education",
  "Travel",
  "Gas & Fuel",
  "General Merchandise",
  "Car Payment",
  "Loan Payment",
  "Gym Membership",
  "Alcohol",
  "Health & Pharmacy",
  "Discount Retail",
  "Transfer",
  "Salary",
  "Pension",
  "Investment Income",
  "Other Income",
];

/** Expense-only categories for pickers (excludes income labels and Transfer). */
export const EXPENSE_CATEGORY_OPTIONS = DEFAULT_EXPENSE_CATEGORIES.filter(
  (category) =>
    resolveTransactionType(category) === "expense" &&
    category.trim().toLowerCase() !== "transfer"
);

export const NON_ESSENTIAL_CATEGORIES = new Set([
  "restaurants",
  "restaurants & cafes",
  "cafe",
  "cafes",
  "coffee",
  "entertainment",
  "dining",
  "bars",
  "takeout",
  "fast food",
  "shopping",
  "subscriptions",
  "travel",
  "clothing",
  "hobbies",
  "alcohol",
]);

export const MERCHANT_CATEGORY_HINTS: Record<string, string> = {
  starbucks: "Restaurants",
  chipotle: "Restaurants",
  mcdonald: "Restaurants",
  uber: "Transport",
  lyft: "Transport",
  shell: "Gas",
  chevron: "Gas",
  esso: "Gas",
  petro: "Gas",
  "whole foods": "Groceries",
  "trader joe": "Groceries",
  netflix: "Subscriptions",
  spotify: "Subscriptions",
  landlord: "Rent",
  electric: "Utilities",
  cvs: "Healthcare",
  amazon: "Shopping",
};

export type RawRow = {
  merchant_name: string;
  category: string;
  amount: number;
  date?: string;
  period?: string;
};

export const COLUMN_ALIASES: Record<string, keyof RawRow> = {
  merchant: "merchant_name",
  "merchant name": "merchant_name",
  category: "category",
  amount: "amount",
  "total amount": "amount",
  "total": "amount",
  "transaction amount": "amount",
  "value": "amount",
  date: "date",
  "transaction date": "date",
  "posting date": "date",
  "posted date": "date",
  period: "period",
  month: "period",
  "statement period": "period",
  "reporting period": "period",
};

export const WHERENEXT_CITY_KEYS: Record<string, string> = {
  "Belgrade, Serbia": "RS-Belgrade",
  "Podgorica, Montenegro": "ME-Podgorica",
  "Sofia, Bulgaria": "BG-Sofia",
  "Tirana, Albania": "AL-Tirana",
  "Tbilisi, Georgia": "GE-Tbilisi",
  "Lisbon, Portugal": "PT-Lisbon",
  "Barcelona, Spain": "ES-Barcelona",
  "Berlin, Germany": "DE-Berlin",
  "London, UK": "GB-London",
};

export const REFERENCE_CITY_GROUPS = [
  {
    label: "Balkans & Caucasus (live data)",
    cities: [
      "Belgrade, Serbia",
      "Podgorica, Montenegro",
      "Sofia, Bulgaria",
      "Tirana, Albania",
      "Tbilisi, Georgia",
    ],
  },
  {
    label: "Europe (live data)",
    cities: ["Lisbon, Portugal", "Barcelona, Spain", "Berlin, Germany", "London, UK"],
  },
  {
    label: "North America (reference benchmarks)",
    cities: ["Abbotsford, Canada", "Chicago, USA", "Toronto, Canada", "Montreal, Canada"],
  },
] as const;

export const BALKAN_REFERENCE_CITIES = REFERENCE_CITY_GROUPS[0].cities;

export const ALL_REFERENCE_CITIES = REFERENCE_CITY_GROUPS.flatMap((group) => group.cities);

export const CATEGORY_ALIASES: Record<string, string> = {
  rent: "rent",
  housing: "rent",
  groceries: "groceries",
  grocery: "groceries",
  "mortgage payment": "mortgage",
  mortgage: "mortgage",
  "mortgage payments": "mortgage",
  restaurants: "restaurants",
  restaurant: "restaurants",
  dining: "restaurants",
  cafe: "restaurants",
  cafes: "restaurants",
  coffee: "restaurants",
  "fast food": "restaurants",
  takeout: "restaurants",
  transport: "transport",
  transportation: "transport",
  transit: "transport",
  gas: "gas",
  fuel: "gas",
  gasoline: "gas",
  petrol: "gas",
  "gas & fuel": "gas",
  "gas and fuel": "gas",
  utilities: "utilities",
  utility: "utilities",
  internet: "internet",
  medications: "medications",
  medication: "medications",
  "car payment": "car payment",
  "public transit": "public transit",
  "loan payment": "loan payment",
  "gym membership": "gym membership",
  hobbies: "hobbies",
  hobby: "hobbies",
  entertainment: "entertainment",
  subscriptions: "entertainment",
  shopping: "entertainment",
  electronics: "entertainment",
  clothing: "entertainment",
  travel: "entertainment",
  software: "entertainment",
  "mobile phone": "utilities",
  phone: "utilities",
};
