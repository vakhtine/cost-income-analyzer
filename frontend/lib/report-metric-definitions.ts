import { HealthScoreMetrics } from "@/lib/types";
import {
  avgDailySpendLabel,
  essentialExpensePctLabel,
  expenseToIncomeRatioLabel,
  hhiConcentrationLabel,
  incomeVolatilityPctLabel,
  nonEssentialControlLabel,
  nonEssentialShareLabel,
  stabilityScoreLabel,
  topCategoryShareLabel,
  volatilityPctLabel,
} from "@/lib/metric-tones";
import { formatHealthReportPeriodLabel } from "@/lib/report-dates";

export type ReportMetricDefinition = {
  name: string;
  definition: string;
};

export type HealthMetricsForYouContext = {
  overallScore: number;
  savingsRatePct: number;
  savingsRateScore: number;
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
    name: "Savings rate (%)",
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
    name: "HHI (expense categories)",
    definition:
      "Herfindahl-Hirschman Index — how concentrated spending is across categories (0 = spread out; 1 = one category dominates). Includes a plain-language concentration label.",
  },
  {
    name: "Top expense category share",
    definition: "Percent of total expenses going to your largest expense category.",
  },
  {
    name: "Avg daily spend",
    definition:
      "Total expenses divided by calendar days in the analysis period. Includes a plain-language label (Low / Typical / High) based on how daily spending compares to daily income.",
  },
  {
    name: "Expense volatility (month to month)",
    definition:
      "Month-to-month swing in total expenses (std dev ÷ mean) across all included periods. Does not change when switching the period filter — only period-specific totals like Total expenses change.",
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
    definition:
      "How steady income is across periods. Volatility tiers (std dev ÷ mean): ≤2% → 95, 2–5% → 80, 5–10% → 65, ≥10% → 50.",
  },
  {
    name: "Expense stability",
    definition:
      "How steady total expenses are across periods. Volatility tiers (std dev ÷ mean): ≤2% → 95, 2–5% → 80, 5–10% → 65, ≥10% → 50.",
  },
  {
    name: "Essential expense %",
    definition: "Share of total expenses classified as essential (housing, utilities, groceries, etc.). Includes a plain-language level label.",
  },
  {
    name: "Periods analyzed",
    definition:
      "Number of statement months used for income and expense stability calculations. Other metrics use the focus period shown in the header.",
  },
];

function discretionarySpendingNeedsWork(context: HealthMetricsForYouContext) {
  return context.nonEssentialScore < 75;
}

function savingsRateNeedsWork(context: HealthMetricsForYouContext) {
  return context.savingsRateScore < 70 && context.savingsRatePct < 20;
}

function buildOverallScoreTip(context: HealthMetricsForYouContext): string {
  if (context.overallScore >= 75) {
    return `Your overall financial health score is strong at <strong>${context.overallScore}/100</strong> — keep your savings rate steady and avoid letting one category dominate spending.`;
  }

  if (context.overallScore >= 50) {
    const improvements: string[] = [];
    if (savingsRateNeedsWork(context)) {
      improvements.push(
        `raising your savings rate (currently <strong>${context.savingsRatePct.toFixed(1)}%</strong>)`
      );
    } else if (context.savingsRateScore < 85 && context.savingsRatePct < 30) {
      improvements.push(
        `building on your <strong>${context.savingsRatePct.toFixed(1)}%</strong> savings rate toward an even stronger buffer`
      );
    }
    if (discretionarySpendingNeedsWork(context)) {
      improvements.push("trimming discretionary categories");
    }
    if (context.incomeStabilityScore < 70) {
      improvements.push("smoothing irregular income");
    }
    if (context.expenseStabilityScore < 70) {
      improvements.push("stabilizing month-to-month spending");
    }

    if (improvements.length === 0) {
      return `Your score is moderate at <strong>${context.overallScore}/100</strong>. Savings and discretionary spending already look solid — focus on income or expense stability if you want to push the score higher.`;
    }

    const last = improvements.pop();
    const joined =
      improvements.length > 0 ? `${improvements.join(", ")}, and ${last}` : (last ?? "");
    return `Your score is moderate at <strong>${context.overallScore}/100</strong>. ${joined.charAt(0).toUpperCase()}${joined.slice(1)} would lift your financial health score.`;
  }

  const steps: string[] = ["Focus first on closing the gap between income and expenses"];
  if (discretionarySpendingNeedsWork(context)) {
    steps.push(
      `reduce non-essential spending (currently <strong>${context.nonEssentialOfExpensesPct.toFixed(1)}%</strong> of expenses)`
    );
  }
  return `Your score has room to improve at <strong>${context.overallScore}/100</strong>. ${steps.join(", then ")}.`;
}

function metricGuidance(context: HealthMetricsForYouContext): string[] {
  const tips: string[] = [];

  tips.push(buildOverallScoreTip(context));

  if (context.savingsRatePct >= 20) {
    tips.push(
      `Savings rate looks healthy at <strong>${context.savingsRatePct.toFixed(1)}%</strong> — you are keeping a solid share of income after bills.`
    );
  } else if (context.savingsRatePct >= 5) {
    tips.push(
      `Savings rate is positive but thin at <strong>${context.savingsRatePct.toFixed(1)}%</strong>. Even a few percentage points more each month improves resilience.`
    );
  } else {
    const discretionaryClause = discretionarySpendingNeedsWork(context)
      ? " and discretionary categories"
      : "";
    tips.push(
      `Savings rate is low or negative at <strong>${context.savingsRatePct.toFixed(1)}%</strong>. Review fixed costs${discretionaryClause} before taking on new obligations.`
    );
  }

  if (context.nonEssentialOfExpensesPct >= 45) {
    tips.push(
      `Non-essential spending is a large share of your expenses at <strong>${context.nonEssentialOfExpensesPct.toFixed(1)}%</strong> (control score <strong>${context.nonEssentialScore}/100</strong>). Trimming discretionary categories would strengthen non-essential spending control and lift your financial health score.`
    );
  } else if (context.nonEssentialOfExpensesPct >= 30) {
    tips.push(
      `Non-essential spending is moderate at <strong>${context.nonEssentialOfExpensesPct.toFixed(1)}%</strong>. Watch dining, entertainment, and shopping — small cuts there improve non-essential spending control without touching essentials.`
    );
  } else if (context.nonEssentialScore >= 70) {
    tips.push(
      `Non-essential spending control looks solid at <strong>${context.nonEssentialScore}/100</strong> — discretionary spending stays in a manageable range (${context.nonEssentialOfExpensesPct.toFixed(1)}% of expenses).`
    );
  } else {
    tips.push(
      `Non-essential spending control has room to improve at <strong>${context.nonEssentialScore}/100</strong> (${context.nonEssentialOfExpensesPct.toFixed(1)}% of expenses). Review discretionary categories first when you need to free up cash.`
    );
  }

  if (context.topCategorySharePct >= 45) {
    tips.push(
      `A large share of spending sits in one category at <strong>${context.topCategorySharePct.toFixed(1)}%</strong> — if that bill spikes, your whole month feels it. Spreading costs helps (HHI: <strong>${context.expenseConcentrationHhi.toFixed(2)}</strong>, ${hhiConcentrationLabel(context.expenseConcentrationHhi).toLowerCase()}).`
    );
  } else {
    tips.push(
      `Spending is reasonably spread across categories — top category share is <strong>${context.topCategorySharePct.toFixed(1)}%</strong> (HHI: <strong>${context.expenseConcentrationHhi.toFixed(2)}</strong>, ${hhiConcentrationLabel(context.expenseConcentrationHhi).toLowerCase()}), which supports stability.`
    );
  }

  if (context.expenseVolatilityPct !== null && context.expenseVolatilityPct > 25) {
    tips.push(
      `Expense volatility is elevated at <strong>${context.expenseVolatilityPct.toFixed(1)}%</strong> (${volatilityPctLabel(context.expenseVolatilityPct).toLowerCase()}, expense stability <strong>${context.expenseStabilityScore}/100</strong>). Smoother month-to-month totals make budgeting and relocation planning easier.`
    );
  }

  if (context.incomeStabilityScore >= 80) {
    tips.push(
      `Income stability is strong at <strong>${context.incomeStabilityScore}/100</strong>${context.incomeVolatilityPct !== null ? ` (volatility ${context.incomeVolatilityPct.toFixed(1)}%)` : ""} — your income stays relatively steady across periods, which supports reliable budgeting.`
    );
  } else if (context.incomeStabilityScore >= 65) {
    tips.push(
      `Income stability is moderate at <strong>${context.incomeStabilityScore}/100</strong>${context.incomeVolatilityPct !== null ? ` (volatility ${context.incomeVolatilityPct.toFixed(1)}%)` : ""}. Some month-to-month income variation makes planning harder — consider smoothing irregular inflows into a buffer.`
    );
  } else {
    tips.push(
      `Income stability is low at <strong>${context.incomeStabilityScore}/100</strong>${context.incomeVolatilityPct !== null ? ` (volatility ${context.incomeVolatilityPct.toFixed(1)}%)` : ""}. Irregular income increases risk — build a buffer and avoid fixed commitments that assume peak months.`
    );
  }

  if (context.expenseStabilityScore >= 80) {
    tips.push(
      `Expense stability looks solid at <strong>${context.expenseStabilityScore}/100</strong> — total spending stays fairly predictable month to month.`
    );
  } else if (context.expenseStabilityScore >= 65) {
    tips.push(
      `Expense stability is moderate at <strong>${context.expenseStabilityScore}/100</strong>${context.expenseVolatilityPct !== null ? ` (volatility ${context.expenseVolatilityPct.toFixed(1)}%)` : ""}. Some month-to-month spending swings make cash-flow planning harder.`
    );
  } else {
    tips.push(
      `Expense stability is weak at <strong>${context.expenseStabilityScore}/100</strong>${context.expenseVolatilityPct !== null ? ` (volatility ${context.expenseVolatilityPct.toFixed(1)}%)` : ""}. Large spending swings make it harder to forecast cash flow and relocation costs.`
    );
  }

  if (context.incomeVolatilityPct !== null && context.incomeVolatilityPct > 25) {
    tips.push(
      `Income volatility is elevated at <strong>${context.incomeVolatilityPct.toFixed(1)}%</strong> (${incomeVolatilityPctLabel(context.incomeVolatilityPct).toLowerCase()}) — consider smoothing irregular deposits or diversifying income sources.`
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
    case "Savings rate (%)":
      return `${metrics.savings_rate_pct.toFixed(1)}%`;
    case "Net savings":
      return formatters.formatIncome(metrics.net_savings);
    case "Expense / income":
      return `${metrics.expense_to_income_ratio.toFixed(1)}% — ${expenseToIncomeRatioLabel(metrics.expense_to_income_ratio)}`;
    case "HHI (expense categories)":
      return `${metrics.expense_concentration_hhi.toFixed(2)} — ${hhiConcentrationLabel(metrics.expense_concentration_hhi)}`;
    case "Top expense category share":
      return `${metrics.top_category_share_pct.toFixed(1)}% — ${topCategoryShareLabel(metrics.top_category_share_pct)}, ${metrics.largest_expense_category}`;
    case "Avg daily spend":
      return `${formatters.formatExpense(metrics.avg_daily_spend)} — ${avgDailySpendLabel(metrics.expense_to_income_ratio)}`;
    case "Expense volatility (month to month)":
      return metrics.expense_volatility_pct !== null
        ? `${metrics.expense_volatility_pct.toFixed(1)}% — ${volatilityPctLabel(metrics.expense_volatility_pct)}`
        : "N/A";
    case "Non-essential %":
      return `${metrics.non_essential_of_expenses_pct.toFixed(1)}% — ${nonEssentialShareLabel(metrics.non_essential_of_expenses_pct)}`;
    case "Non-essential control":
      return `${healthScores.nonEssentialScore}/100 — ${nonEssentialControlLabel(healthScores.nonEssentialScore)}`;
    case "Income stability":
      return `${healthScores.incomeStabilityScore}/100 — ${stabilityScoreLabel(healthScores.incomeStabilityScore)}`;
    case "Expense stability":
      return `${healthScores.expenseStabilityScore}/100 — ${stabilityScoreLabel(healthScores.expenseStabilityScore)}`;
    case "Essential expense %":
      return `${metrics.essential_expense_pct.toFixed(1)}% — ${essentialExpensePctLabel(metrics.essential_expense_pct)}`;
    case "Periods analyzed":
      return metrics.period_count > 1
        ? `${metrics.period_count} (stability)`
        : String(metrics.period_count);
    default:
      return "—";
  }
}

/** One-line definitions sized for PDF supporting-metrics table (avoids page clipping). */
const PDF_SUPPORTING_METRIC_DEFINITIONS: Record<string, string> = {
  "Savings rate (%)": "Income left after expenses in the selected period.",
  "Net savings": "Total income minus total expenses for the period.",
  "Expense / income": "Expenses as a share of income; includes an overstretched / healthy label.",
  "HHI (expense categories)": "How concentrated spending is across categories (0 = spread out; 1 = one dominates).",
  "Top expense category share": "Largest category as a percent of total expenses.",
  "Avg daily spend": "Total expenses divided by calendar days in the analysis period.",
  "Expense volatility (month to month)": "Month-to-month swing in total expenses across included periods.",
  "Non-essential %": "Discretionary spending share of total expenses.",
  "Non-essential control": "Health factor (0–100) for discretionary spending relative to income.",
  "Income stability": "Health factor (0–100) from income volatility across periods.",
  "Expense stability": "Health factor (0–100) from expense volatility across periods.",
  "Essential expense %": "Share of expenses classified as essential (housing, utilities, groceries, etc.).",
  "Periods analyzed": "Number of statement periods included in stability metrics.",
};

const SUPPORTING_METRIC_NAMES = [
  "Savings rate (%)",
  "Net savings",
  "Expense / income",
  "HHI (expense categories)",
  "Top expense category share",
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
  formatters: SupportingMetricsFormatters,
  options?: { compact?: boolean; pdf?: boolean }
): string {
  const definitionByName = new Map(HEALTH_REPORT_METRICS.map((item) => [item.name, item.definition]));
  const compactClass = options?.compact ? " supporting-metrics-table-compact" : "";
  const pdfClass = options?.pdf ? " supporting-metrics-table-pdf" : "";
  const rows = SUPPORTING_METRIC_NAMES.map((name, index) => {
    const definition = options?.pdf
      ? (PDF_SUPPORTING_METRIC_DEFINITIONS[name] ?? definitionByName.get(name) ?? "")
      : (definitionByName.get(name) ?? "");
    const value = supportingMetricValue(name, metrics, healthScores, formatters);
    return `<tr class="${index % 2 === 0 ? "stripe" : ""}">
      <td><strong>${name}</strong></td>
      <td class="supporting-metric-value">${value}</td>
      <td class="supporting-metric-definition">${definition}</td>
    </tr>`;
  }).join("");

  return `
    <div class="report-table-card supporting-metrics-table-card">
      <h3 class="subsection-title">Supporting metrics</h3>
      <table class="index-table report-table-styled metric-definitions-table supporting-metrics-table${compactClass}${pdfClass}">
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
  options?: {
    includeTable?: boolean;
    maxTips?: number;
    compactTable?: boolean;
    pdf?: boolean;
    layoutClass?: string;
  }
): string {
  const includeTable = options?.includeTable !== false;
  const maxTips = options?.maxTips ?? 4;
  const tips = metricGuidance(context)
    .slice(0, maxTips)
    .map((tip) => `<li>${tip}</li>`)
    .join("");
  const layoutClass = options?.layoutClass ?? " health-metrics-for-you-spread";

  return `
    <div class="report-section-bordered health-metrics-for-you${layoutClass}${options?.compactTable ? " health-metrics-for-you-compact" : ""}${options?.pdf ? " health-metrics-for-you-pdf" : ""}">
      <h2 class="section-title">What these metrics mean for you</h2>
      <ul class="report-tip-list${options?.compactTable ? " report-tip-list-compact" : ""}">${tips}</ul>
      ${includeTable ? buildSupportingMetricsTableHtml(metrics, healthScores, formatters, { compact: options?.compactTable, pdf: options?.pdf }) : ""}
    </div>`;
}
