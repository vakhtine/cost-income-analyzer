import { HealthScoreMetrics } from "@/lib/types";

export type ReportMetricDefinition = {
  name: string;
  definition: string;
};

export type HealthMetricsForYouContext = {
  overallScore: number;
  savingsRatePct: number;
  expenseConcentrationHhi: number;
  topCategorySharePct: number;
  expenseVolatilityPct: number | null;
  incomeVolatilityPct: number | null;
  incomeStabilityScore: number;
  expenseStabilityScore: number;
  nonEssentialOfExpensesPct: number;
  nonEssentialScore: number;
};

export type SupportingMetricsFormatters = {
  formatIncome: (amount: number) => string;
  formatExpense: (amount: number) => string;
};

export const HEALTH_REPORT_METRICS: ReportMetricDefinition[] = [
  {
    name: "Financial health score",
    definition:
      "Overall score (0–100) from savings rate, income stability, expense stability, and non-essential spending control.",
  },
  {
    name: "Savings rate",
    definition: "Share of income left after expenses in the selected period.",
  },
  {
    name: "Net savings",
    definition: "Income minus expenses for the selected period.",
  },
  {
    name: "Expense / income",
    definition: "Total expenses as a percentage of total income in the period.",
  },
  {
    name: "HHI (expenses categories)",
    definition:
      "Herfindahl-Hirschman Index — how concentrated spending is across categories (0 = spread out; 1 = one category dominates).",
  },
  {
    name: "Top expenses category share",
    definition: "Percent of total expenses going to your largest expenses category.",
  },
  {
    name: "Avg daily spend",
    definition: "Total expenses divided by the number of days with transactions in the period.",
  },
  {
    name: "Expense volatility (month to month)",
    definition:
      "Month-to-month swing in total expenses, measured as coefficient of variation across periods.",
  },
  {
    name: "Non-essential %",
    definition:
      "Share of total expenses classified as non-essential (discretionary categories such as dining, entertainment, and shopping).",
  },
  {
    name: "Non-essential control",
    definition:
      "Financial health factor (0–100) based on how much of your income goes to non-essential spending — lower discretionary share scores higher.",
  },
  {
    name: "Income stability",
    definition: "How steady income is across periods, based on month-to-month income variation.",
  },
  {
    name: "Expense stability",
    definition: "How steady total expenses are across periods, based on month-to-month expense variation.",
  },
  {
    name: "Essential expense %",
    definition: "Share of total expenses classified as essential (housing, utilities, groceries, etc.).",
  },
  {
    name: "Periods analyzed",
    definition: "Number of statement periods included in the health score calculation.",
  },
];

function metricGuidance(context: HealthMetricsForYouContext): string[] {
  const tips: string[] = [];

  if (context.overallScore >= 75) {
    tips.push(
      "Your overall financial health score is strong — keep your savings rate steady and avoid letting one category dominate spending."
    );
  } else if (context.overallScore >= 50) {
    tips.push(
      "Your score is moderate. Raising your savings rate and trimming discretionary categories would lift your financial health score."
    );
  } else {
    tips.push(
      "Your score has room to improve. Focus first on closing the gap between income and expenses, then reduce non-essential spending."
    );
  }

  if (context.savingsRatePct >= 20) {
    tips.push("Savings rate looks healthy — you are keeping a solid share of income after bills.");
  } else if (context.savingsRatePct >= 5) {
    tips.push(
      "Savings rate is positive but thin. Even a few percentage points more each month improves resilience."
    );
  } else {
    tips.push(
      "Savings rate is low or negative. Review fixed costs and discretionary categories before taking on new obligations."
    );
  }

  if (context.nonEssentialOfExpensesPct >= 45) {
    tips.push(
      "Non-essential spending is a large share of your expenses. Trimming discretionary categories would strengthen non-essential control and lift your financial health score."
    );
  } else if (context.nonEssentialOfExpensesPct >= 30) {
    tips.push(
      "Non-essential spending is moderate. Watch dining, entertainment, and shopping — small cuts there improve non-essential control without touching essentials."
    );
  } else if (context.nonEssentialScore >= 70) {
    tips.push(
      "Non-essential control looks solid — discretionary spending stays in a manageable range relative to income."
    );
  } else {
    tips.push(
      "Non-essential control has room to improve. Review discretionary categories first when you need to free up cash."
    );
  }

  if (context.topCategorySharePct >= 45) {
    tips.push(
      "A large share of spending sits in one category — if that bill spikes, your whole month feels it. Spreading costs helps."
    );
  } else {
    tips.push("Spending is reasonably spread across categories — that supports stability.");
  }

  if (context.expenseVolatilityPct !== null && context.expenseVolatilityPct > 25) {
    tips.push(
      "Expense volatility is elevated. Smoother month-to-month totals make budgeting and relocation planning easier."
    );
  }

  if (context.incomeStabilityScore >= 75) {
    tips.push(
      "Income stability is strong — your income stays relatively steady across periods, which supports reliable budgeting."
    );
  } else if (context.incomeStabilityScore >= 50) {
    tips.push(
      "Income stability is moderate. Large month-to-month income swings make it harder to plan savings and fixed costs."
    );
  } else {
    tips.push(
      "Income stability is low. Irregular income increases risk — build a buffer and avoid fixed commitments that assume peak months."
    );
  }

  if (context.expenseStabilityScore >= 75) {
    tips.push(
      "Expense stability looks solid — total spending stays fairly predictable month to month."
    );
  } else if (context.expenseStabilityScore < 50) {
    tips.push(
      "Expense stability is weak. Large spending swings make it harder to forecast cash flow and relocation costs."
    );
  }

  if (context.incomeVolatilityPct !== null && context.incomeVolatilityPct > 25) {
    tips.push(
      "Income volatility is elevated — consider smoothing irregular deposits or diversifying income sources."
    );
  }

  return tips;
}

function supportingMetricValue(
  name: string,
  metrics: HealthScoreMetrics,
  healthScores: {
    incomeStabilityScore: number;
    expenseStabilityScore: number;
    nonEssentialScore: number;
  },
  formatters: SupportingMetricsFormatters
): string {
  switch (name) {
    case "Savings rate":
      return `${metrics.savings_rate_pct.toFixed(1)}%`;
    case "Net savings":
      return formatters.formatIncome(metrics.net_savings);
    case "Expense / income":
      return `${metrics.expense_to_income_ratio.toFixed(1)}%`;
    case "HHI (expenses categories)":
      return metrics.expense_concentration_hhi.toFixed(2);
    case "Top expenses category share":
      return `${metrics.top_category_share_pct.toFixed(1)}%, ${metrics.largest_expense_category}`;
    case "Avg daily spend":
      return formatters.formatExpense(metrics.avg_daily_spend);
    case "Expense volatility (month to month)":
      return metrics.expense_volatility_pct !== null
        ? `${metrics.expense_volatility_pct.toFixed(1)}%`
        : "N/A";
    case "Non-essential %":
      return `${metrics.non_essential_of_expenses_pct.toFixed(1)}%`;
    case "Non-essential control":
      return `${healthScores.nonEssentialScore}/100`;
    case "Income stability":
      return `${healthScores.incomeStabilityScore}/100`;
    case "Expense stability":
      return `${healthScores.expenseStabilityScore}/100`;
    case "Essential expense %":
      return `${metrics.essential_expense_pct.toFixed(1)}%`;
    case "Periods analyzed":
      return String(metrics.period_count);
    default:
      return "—";
  }
}

const SUPPORTING_METRIC_NAMES = [
  "Savings rate",
  "Net savings",
  "Expense / income",
  "HHI (expenses categories)",
  "Top expenses category share",
  "Avg daily spend",
  "Expense volatility (month to month)",
  "Non-essential %",
  "Non-essential control",
  "Income stability",
  "Expense stability",
  "Essential expense %",
  "Periods analyzed",
] as const;

function buildSupportingMetricsTableHtml(
  metrics: HealthScoreMetrics,
  healthScores: {
    incomeStabilityScore: number;
    expenseStabilityScore: number;
    nonEssentialScore: number;
  },
  formatters: SupportingMetricsFormatters
): string {
  const definitionByName = new Map(HEALTH_REPORT_METRICS.map((item) => [item.name, item.definition]));
  const rows = SUPPORTING_METRIC_NAMES.map((name, index) => {
    const definition = definitionByName.get(name) ?? "";
    const value = supportingMetricValue(name, metrics, healthScores, formatters);
    return `<tr class="${index % 2 === 0 ? "stripe" : ""}">
      <td><strong>${name}</strong></td>
      <td class="supporting-metric-value">${value}</td>
      <td>${definition}</td>
    </tr>`;
  }).join("");

  return `
    <div class="report-table-card report-table-card-compact supporting-metrics-table-card">
      <h3 class="subsection-title">Supporting metrics</h3>
      <table class="index-table report-table-styled metric-definitions-table supporting-metrics-table supporting-metrics-table-compact">
        <thead><tr><th>Metric</th><th>Your value</th><th>Definition</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

export function buildHealthMetricsForYouHtml(
  context: HealthMetricsForYouContext,
  metrics: HealthScoreMetrics,
  healthScores: {
    incomeStabilityScore: number;
    expenseStabilityScore: number;
    nonEssentialScore: number;
  },
  formatters: SupportingMetricsFormatters,
  options?: { includeTable?: boolean; maxTips?: number }
): string {
  const includeTable = options?.includeTable !== false;
  const maxTips = options?.maxTips ?? 4;
  const tips = metricGuidance(context)
    .slice(0, maxTips)
    .map((tip) => `<li>${tip}</li>`)
    .join("");

  return `
    <div class="report-section-bordered report-section-compact health-metrics-for-you">
      <h2 class="section-title">What these metrics mean for you</h2>
      <p class="report-explanatory-callout">Your financial health score combines four factors — savings rate, income stability, expense stability, and non-essential control — each weighted 25%. The tips below interpret those factors plus the supporting metrics in the table.</p>
      <ul class="report-tip-list report-tip-list-compact">${tips}</ul>
      ${includeTable ? buildSupportingMetricsTableHtml(metrics, healthScores, formatters) : ""}
    </div>`;
}
