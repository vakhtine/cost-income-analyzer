export type CurrencyCode =
  | "USD"
  | "EUR"
  | "GBP"
  | "ALL"
  | "RSD"
  | "BAM"
  | "MKD"
  | "CHF"
  | "CAD"
  | "AUD"
  | "BGN"
  | "HRK"
  | "RON"
  | "TRY";

export type ExchangeRates = {
  base: CurrencyCode;
  date: string;
  rates: Record<string, number>;
};

export const SUPPORTED_CURRENCIES: { code: CurrencyCode; label: string; symbol: string }[] = [
  { code: "USD", label: "US Dollar", symbol: "$" },
  { code: "EUR", label: "Euro", symbol: "€" },
  { code: "GBP", label: "British Pound", symbol: "£" },
  { code: "ALL", label: "Albanian Lek", symbol: "L" },
  { code: "RSD", label: "Serbian Dinar", symbol: "din" },
  { code: "BAM", label: "Bosnia Mark", symbol: "KM" },
  { code: "MKD", label: "Macedonian Denar", symbol: "den" },
  { code: "CHF", label: "Swiss Franc", symbol: "Fr" },
  { code: "CAD", label: "Canadian Dollar", symbol: "C$" },
  { code: "AUD", label: "Australian Dollar", symbol: "A$" },
  { code: "BGN", label: "Bulgarian Lev", symbol: "лв" },
  { code: "RON", label: "Romanian Leu", symbol: "lei" },
  { code: "TRY", label: "Turkish Lira", symbol: "₺" },
];

export const DEFAULT_CURRENCY: CurrencyCode = "USD";

export function currencyLabel(code: CurrencyCode) {
  return SUPPORTED_CURRENCIES.find((item) => item.code === code)?.label ?? code;
}

export function formatMoney(value: number, currency: CurrencyCode = DEFAULT_CURRENCY) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "ALL" || currency === "RSD" || currency === "MKD" ? 0 : 2,
  }).format(value);
}

function rateFor(code: CurrencyCode, rates: ExchangeRates): number {
  if (code === rates.base) return 1;
  return rates.rates[code] ?? 1;
}

export function convertAmount(
  amount: number,
  from: CurrencyCode,
  to: CurrencyCode,
  rates: ExchangeRates
): number {
  if (from === to) return amount;
  const inBase = from === rates.base ? amount : amount / rateFor(from, rates);
  return to === rates.base ? inBase : inBase * rateFor(to, rates);
}

export function convertIncomeAmount(
  amount: number,
  incomeCurrency: CurrencyCode,
  displayCurrency: CurrencyCode,
  rates: ExchangeRates
) {
  return convertAmount(amount, incomeCurrency, displayCurrency, rates);
}

export function convertExpenseAmount(
  amount: number,
  expenseCurrency: CurrencyCode,
  displayCurrency: CurrencyCode,
  rates: ExchangeRates
) {
  return convertAmount(amount, expenseCurrency, displayCurrency, rates);
}

export type CurrencySettings = {
  incomeCurrency: CurrencyCode;
  expenseCurrency: CurrencyCode;
  displayCurrency: CurrencyCode;
};

export const DEFAULT_CURRENCY_SETTINGS: CurrencySettings = {
  incomeCurrency: "USD",
  expenseCurrency: "USD",
  displayCurrency: "USD",
};

const STORAGE_KEY = "cia-currency-settings";

export function loadCurrencySettings(): CurrencySettings {
  if (typeof window === "undefined") return DEFAULT_CURRENCY_SETTINGS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CURRENCY_SETTINGS;
    return { ...DEFAULT_CURRENCY_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_CURRENCY_SETTINGS;
  }
}

export function saveCurrencySettings(settings: CurrencySettings) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}
