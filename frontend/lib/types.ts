export type TransactionType = "income" | "expense" | "transfer";

export type Transaction = {
  id: number;
  merchant_name: string;
  category: string;
  amount: number;
  date?: string;
  period: string;
  transaction_type: TransactionType;
  abs_amount: number;
};

export type CategorySummary = {
  category: string;
  total: number;
  count: number;
  pct_of_income: number;
  pct_of_expenses: number | null;
};

export type MerchantSummary = {
  merchant_name: string;
  category: string;
  total: number;
};

export type PeriodAnalysis = {
  total_income: number;
  total_expenses: number;
  net_savings: number;
  savings_rate: number;
  income_categories: CategorySummary[];
  expense_categories: CategorySummary[];
  top_merchants: MerchantSummary[];
  unusual_expenses: CategorySummary[];
  insights: string[];
};

export type HealthScoreMetrics = {
  savings_rate_pct: number;
  total_income: number;
  total_expenses: number;
  net_savings: number;
  non_essential_pct: number;
  non_essential_total: number;
  income_source_count: number;
  period_count: number;
  income_volatility_pct: number | null;
  expense_to_income_ratio: number;
  largest_expense_category: string;
  largest_expense_amount: number;
  essential_expense_pct: number;
  avg_daily_spend: number;
  non_essential_of_expenses_pct: number;
  expense_volatility_pct: number | null;
  expense_concentration_hhi: number;
  top_category_share_pct: number;
  diversification_score: number;
};

export type HealthScore = {
  overall: number;
  savings_rate_score: number;
  income_stability_score: number;
  non_essential_score: number;
  summary: string;
  details: string[];
  metrics?: HealthScoreMetrics;
};

export type CategoryDriver = {
  merchant_name: string;
  delta: number;
  transaction_amount: number;
};

export type CategoryVolatility = {
  category: string;
  volatility_pct: number;
  period_totals: { period: string; total: number }[];
  avg_total: number;
};

export type AnomalyFlag = {
  merchant_name: string;
  category: string;
  amount: number;
  period: string;
  transaction_count: number;
  multiplier: number;
  description: string;
};

export type CategoryTrend = {
  category: string;
  current_total: number;
  prior_total: number;
  change_pct: number;
  trend: "Spike" | "Up" | "Down" | "Stable";
};

export type CategoryChange = {
  category: string;
  transaction_type: TransactionType;
  previous_total: number;
  current_total: number;
  change_amount: number;
  change_pct: number;
  top_drivers: CategoryDriver[];
};

export type PeriodComparison = {
  previous_period: string;
  current_period: string;
  income_change: number;
  income_change_pct: number;
  expense_change: number;
  expense_change_pct: number;
  category_changes: CategoryChange[];
};

export type CategorizationFlag = {
  row_id: number;
  period: string;
  merchant_name: string;
  current_category: string;
  suggested_category: string;
  reason: string;
  amount: number;
};

export type PeriodReportSelection =
  | { mode: "single"; period: string }
  | { mode: "range"; start: string; end: string };

export type AnalyzeResponse = {
  periods: string[];
  /** Period labels fixed at upload time (CSV files, Period column, or Excel sheets). */
  upload_periods: string[];
  period_analysis: Record<string, PeriodAnalysis>;
  period_rows: Record<string, Transaction[]>;
  comparison: PeriodComparison | null;
  health_score: HealthScore;
  categorization_flags: CategorizationFlag[];
  advisor_notes: string[];
  privacy_notice: string;
};

export type LocationComparison = {
  category: string;
  user_amount: number;
  reference_amount: number;
  difference: number;
  difference_pct: number;
  status: string;
};

export type CityBenchmarkMeta = {
  city: string;
  source: string;
  updated: string;
  license: string;
  citation: string;
};

export type LocationCompareResult = {
  base_city?: string;
  period_label: string;
  comparison_basis?: "monthly";
  reference_monthly_total: number;
  reference_city: string;
  household_size: number;
  reference_benchmarks: Record<string, number>;
  original_benchmarks: Record<string, number>;
  comparisons: LocationComparison[];
  metadata: CityBenchmarkMeta;
};
