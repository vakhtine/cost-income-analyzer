/** Brief plain-language labels and one-line explanations for analyze metrics. */

export const PLAIN_LANGUAGE_LABELS: Record<string, string> = {
  "Income sources": "Income sources",
  "Total income": "Total income",
  "Savings rate & net savings": "Savings rate & net savings",
  "Discretionary spending": "Discretionary spending",
  "Income stability & volatility": "Income stability & volatility",
  "Income stability": "Income stability",
  "Income volatility (month to month)": "Income volatility (month to month)",
  "Expense categories": "Expense categories",
  "Total expenses": "Total expenses",
  "Periods analyzed": "Periods analyzed",
  "Concentration (HHI, expense categories)": "Expense concentration (HHI)",
  "Top expense category share": "Largest category share",
  "Expense volatility (month to month)": "Expense volatility (month to month)",
  "Avg daily spend": "Average daily spend",
  "Savings rate factor": "Savings rate",
  "Income stability factor": "Income stability",
  "Expense stability factor": "Expense stability",
  "Non-essential control": "Non-essential spending control",
  Volatility: "Volatility (month to month)",
  HHI: "Expense concentration (HHI)",
};

export const PLAIN_LANGUAGE_EXPLANATIONS: Record<string, string> = {
  "Income sources": "How many separate income streams appear in this period.",
  "Total income": "All money in from salary, pension, investments, and other income categories.",
  "Savings rate & net savings":
    "Share of income kept after expenses, with the dollar amount saved for this period.",
  "Discretionary spending":
    "Total spent in discretionary categories (dining, entertainment, shopping, subscriptions, travel, alcohol, and similar) for this period, as a share of total expenses.",
  "Savings rate": "Share of income left after expenses — higher means more room to save.",
  "Net savings": "Income minus expenses for the selected period.",
  "Income stability": "Score from how steady your income is month to month (100 = very steady).",
  "Income stability & volatility":
    "Income stability score (0–100) and month-to-month income swing as a percentage when multiple periods are available. Uses all included months — unchanged when you switch the period filter.",
  "Income volatility (month to month)":
    "How much total income swings between periods, as a percentage.",
  "Expense categories":
    "Number of distinct expense categories found in your financial statements for this period.",
  "Total expenses": "All spending in essential and discretionary categories for this period.",
  "Periods analyzed": "Number of statement months included in this score.",
  "Concentration (HHI, expense categories)":
    "Herfindahl-Hirschman Index — measures how concentrated spending is across categories. 0 = spread out; 1 = one category dominates.",
  "Top expense category share":
    "Percent of total expenses going to your single largest category.",
  "Expense volatility (month to month)":
    "Month-to-month swing in total expenses across all included periods (std dev ÷ mean). Uses every included month — it stays the same when you change the period filter; only Total expenses above changes per period.",
  "Expense stability & volatility":
    "Expense stability score (0–100) and month-to-month total spending swing across all included periods.",
  "Avg daily spend": "Total expenses divided by days with transactions in the period.",
  "Savings rate factor": "How much of your income you keep after bills (30% of health score).",
  "Income stability factor": "How predictable income is across months (20% of health score).",
  "Expense stability factor": "How predictable total spending is across months (20% of health score).",
  "Non-essential control":
    "How well discretionary spending is kept in check relative to income (30% of health score).",
  Volatility:
    "Month-to-month variation in each category — coefficient of variation across periods.",
  HHI: "Expense concentration — higher values mean fewer categories dominate your spending.",
  "Trend & anomaly view":
    "Category breakdown, month-over-month changes, and unusual spikes vs the prior period.",
  "Anomaly flags":
    "Highlights when a merchant spends at least 10× the prior month in that category.",
};

export function plainLabel(key: string, plainLanguage: boolean, fallback: string) {
  if (!plainLanguage) return fallback;
  return PLAIN_LANGUAGE_LABELS[key] ?? PLAIN_LANGUAGE_LABELS[fallback] ?? fallback;
}

export function plainExplanation(key: string, plainLanguage: boolean): string | null {
  if (!plainLanguage) return null;
  return PLAIN_LANGUAGE_EXPLANATIONS[key] ?? PLAIN_LANGUAGE_EXPLANATIONS[fallbackKey(key)] ?? null;
}

function fallbackKey(key: string) {
  return key;
}
