import { CityRecommendation } from "@/lib/city-recommender";
import { formatCategoryDisplayName, getCategoryPdfSymbol } from "@/lib/category-icons";
import { canonicalExpenseCategory } from "@/lib/category-normalize";
import { topMerchantsByCategoryMap } from "@/lib/category-merchants";
import { buildCategoryChangeExplanations, topMerchantsForPeriod } from "@/lib/report-insights";
import {
  buildFactorScorecardHtml,
  buildKpiStripHtml,
  buildReportIntroBlock,
  buildRoundedBarChartHtml,
  buildVerticalRankChartHtml,
  scoreBandLabel,
  scoreBandTone,
} from "@/lib/report-charts";
import { getPeriodExpenseDateLabel, getReportPrivacyNotice } from "@/lib/report-dates";
import {
  buildReportDocument,
  buildReportPageShell,
  downloadReportPdf,
  escapeHtml,
} from "@/lib/report-export";
import { healthScoreForReportSelection } from "@/lib/rebuild";
import { HEALTH_SCORE_WEIGHTS } from "@/lib/health-score";
import {
  buildHealthMetricsForYouHtml,
} from "@/lib/report-metric-definitions";
import {
  adjacentPeriodPair,
  combinePeriodRowsInRange,
  computeCategoryTrends,
  detectAnomalies,
  expenseSpendType,
} from "@/lib/spending-metrics";
import { periodHasReportableData } from "@/lib/transaction-filters";
import { AnalyzeResponse, PeriodAnalysis, PeriodReportSelection } from "@/lib/types";

export type { PeriodReportSelection };

export type CustomReportType =
  | "expenses-by-category"
  | "financial-health"
  | "best-fit-cities";

export const CUSTOM_REPORT_LABELS: Record<CustomReportType, string> = {
  "expenses-by-category": "Expenses by category",
  "financial-health": "Financial health score",
  "best-fit-cities": "Best-fit cities by budget",
};

export type CustomReportPayload = {
  generatedAt: string;
  periodLabel: string;
  periodSelection: PeriodReportSelection;
  baseCity?: string;
  displayCurrency: string;
  data: AnalyzeResponse;
  periodAnalysis: PeriodAnalysis;
  recommendations: CityRecommendation[];
  formatIncome: (amount: number) => string;
  formatExpense: (amount: number) => string;
};

type PageContext = {
  pageNumber: number;
  totalPages: number;
  showGeneratedAt: boolean;
};

const REPORT_LABEL = "Custom financial report";

function pageShell(
  context: PageContext,
  title: string,
  body: string,
  privacyNotice: string,
  payload: CustomReportPayload,
  options?: { pageBreakBefore?: boolean }
) {
  const intro =
    context.showGeneratedAt
      ? buildReportIntroBlock(
          payload.periodLabel,
          payload.displayCurrency,
          privacyNotice,
          "Custom financial report generated from your uploaded statements."
        )
      : "";

  return buildReportPageShell({
    pageNumber: context.pageNumber,
    totalPages: context.totalPages,
    reportLabel: REPORT_LABEL,
    pageTitle: title,
    body: `${intro}${body}`,
    privacyNotice,
    showPrivacy: false,
    pageBreakBefore: options?.pageBreakBefore,
    meta: {
      periodLabel: payload.periodLabel,
      displayCurrency: payload.displayCurrency,
    },
  });
}

function reportTableCard(title: string, subtitle: string, tableHtml: string, compact = false) {
  return `
    <div class="report-table-card${compact ? " report-table-card-compact" : ""}">
      <h2 class="section-title">${title}</h2>
      ${subtitle ? `<p class="muted-note">${subtitle}</p>` : ""}
      ${tableHtml}
    </div>`;
}

function trendChangeClass(changePct: number) {
  if (changePct < -5) return "pos";
  if (changePct > 5) return "neg";
  return "";
}

function effectivePeriodRows(payload: CustomReportPayload) {
  const { data, periodSelection } = payload;
  if (periodSelection.mode === "range") {
    return combinePeriodRowsInRange(
      data.period_rows,
      data.periods,
      periodSelection.start,
      periodSelection.end
    );
  }
  return data.period_rows[periodSelection.period] ?? [];
}

function effectiveFocusPeriod(payload: CustomReportPayload) {
  if (payload.periodSelection.mode === "range") {
    return payload.periodSelection.end;
  }
  return payload.periodSelection.period;
}

function formatCategoryCell(
  category: string,
  merchants: string[] | undefined,
  symbol: string
): string {
  const merchantNote =
    merchants && merchants.length
      ? `<div class="category-merchants-note">${escapeHtml(merchants.join(" · "))}</div>`
      : "";
  return `${symbol} ${escapeHtml(formatCategoryDisplayName(category))}${merchantNote}`;
}

function buildTrendContext(payload: CustomReportPayload) {
  const { data } = payload;
  const focusPeriod = effectiveFocusPeriod(payload);
  const periodRows = effectivePeriodRows(payload);
  const periodOrder = data.periods.filter((period) =>
    periodHasReportableData(data.period_rows[period] ?? [])
  );
  const trends = periodOrder.length >= 2 ? computeCategoryTrends(data.period_rows, periodOrder, focusPeriod) : null;
  const anomalies = detectAnomalies(data.period_rows, periodOrder, focusPeriod);
  const periodPair = adjacentPeriodPair(periodOrder, focusPeriod);

  return {
    focusPeriod,
    periodRows,
    trends,
    anomalies,
    periodPair,
  };
}

function isMortgageCategory(category: string) {
  const canonical = canonicalExpenseCategory(category);
  return canonical === "Mortgage payment" || canonical.toLowerCase().includes("mortgage");
}

function buildTrendOverviewSection(payload: CustomReportPayload) {
  const { trends, periodPair } = buildTrendContext(payload);
  const { data } = payload;

  if (!trends?.length || !periodPair) {
    return `<p class="muted-note">Upload more than one month to unlock category change explanations.</p>`;
  }

  return `<table class="index-table report-table-styled category-changes-table-large">
     <thead><tr><th>Expenses category</th><th>Explanation</th></tr></thead>
     <tbody>${buildCategoryChangeExplanations(trends, data.period_rows, periodPair.currentPeriod, periodPair.priorPeriod, 5, payload.formatExpense)
       .map(
         (item, index) => `
       <tr class="${index % 2 === 0 ? "stripe" : ""}">
         <td>${escapeHtml(formatCategoryDisplayName(item.category))}</td>
         <td class="${trendChangeClass(item.change_pct)}">${escapeHtml(item.explanation)}</td>
       </tr>`
       )
       .join("")}</tbody>
   </table>`;
}

function buildMerchantsAndCategoryChangesPage(payload: CustomReportPayload, context: PageContext) {
  const periodRows = effectivePeriodRows(payload);
  const allMerchants = topMerchantsForPeriod(periodRows, 15);
  const topIsMortgage =
    allMerchants.length > 0 && isMortgageCategory(allMerchants[0].category);
  const chartMerchants = topIsMortgage
    ? allMerchants.filter((item) => !isMortgageCategory(item.category)).slice(0, 10)
    : allMerchants.slice(0, 10);

  const mortgageCallout = topIsMortgage
    ? `<p class="report-explanatory-callout"><strong>#1 — Mortgage payment</strong> is your largest expense merchant and category (<strong>${escapeHtml(allMerchants[0].label)}</strong>, ${payload.formatExpense(allMerchants[0].value)}). It is excluded from the chart below; remaining merchants are ranked #1–#${chartMerchants.length}.</p>`
    : "";

  const chartHtml = buildVerticalRankChartHtml(
    chartMerchants.map((item) => ({
      label: item.label,
      value: item.value,
      sublabel: formatCategoryDisplayName(item.category),
    }))
  );

  const body = `
    ${reportTableCard(
      "Top merchants by expenses category",
      "Highest-spend merchants ranked by total for this period (bar height = relative spend).",
      `${mortgageCallout}${chartHtml}`,
      true
    )}
    ${reportTableCard(
      "Category changes",
      "Compared with the previous month — shifts and the merchants that drove the biggest changes.",
      buildTrendOverviewSection(payload),
      true
    )}
  `;

  return pageShell(
    context,
    "Merchants & category changes",
    body,
    getReportPrivacyNotice(payload.data.privacy_notice),
    payload,
    { pageBreakBefore: true }
  );
}

function buildTopCategoriesVisuals(payload: CustomReportPayload) {
  const topCategories = payload.periodAnalysis.expense_categories.slice(0, 5);

  const bars = buildRoundedBarChartHtml(
    topCategories.map((item) => ({
      label: item.category,
      value: item.total,
      symbol: getCategoryPdfSymbol(item.category),
    })),
    payload.formatExpense
  );

  return `
    <div class="chart-panel chart-panel-compact">
      <h2 class="section-title">Top 5 expenses categories</h2>
      ${bars}
    </div>`;
}

function buildExpensesTablePage(payload: CustomReportPayload, context: PageContext) {
  const { periodAnalysis, periodLabel } = payload;
  const categories = periodAnalysis.expense_categories;
  const periodRows = effectivePeriodRows(payload);
  const expenseDateLabel = getPeriodExpenseDateLabel(periodRows, periodLabel);
  const merchantsMap = topMerchantsByCategoryMap(periodRows);

  const topRows = periodAnalysis.expense_categories
    .slice(0, 5)
    .map((item, index) => {
      const symbol = getCategoryPdfSymbol(item.category);
      const spendType = expenseSpendType(item.category);
      return `
      <tr class="${index % 2 === 0 ? "stripe" : ""}">
        <td>${formatCategoryCell(item.category, merchantsMap.get(item.category), symbol)}</td>
        <td>${item.count}</td>
        <td>${payload.formatExpense(item.total)}</td>
        <td class="pct-cell-center">${item.pct_of_expenses?.toFixed(1) ?? "—"}%</td>
        <td><span class="type-pill type-pill-${spendType.toLowerCase()}">${spendType}</span></td>
      </tr>`;
    })
    .join("");

  const body = `
    <div class="hero-zone hero-zone-compact">
      ${buildKpiStripHtml([
        { label: "Total expenses", value: payload.formatExpense(periodAnalysis.total_expenses) },
        { label: "Total income", value: payload.formatIncome(periodAnalysis.total_income) },
        { label: "Income/expenses categories tracked", value: String(categories.length) },
      ])}
      ${buildTopCategoriesVisuals(payload)}
    </div>
    <div class="details-section details-section-flush">
      ${reportTableCard(
        "Top 5 expenses category summary",
        escapeHtml(expenseDateLabel),
        `<table class="index-table report-table-styled compact">
        <thead>
          <tr>
            <th>Expenses category</th>
            <th>Txns</th>
            <th>Total</th>
            <th class="pct-cell-center">% expenses</th>
            <th>Type</th>
          </tr>
        </thead>
        <tbody>${topRows}</tbody>
      </table>`,
        true
      )}
    </div>
  `;

  return pageShell(
    context,
    "Expenses by category",
    body,
    getReportPrivacyNotice(payload.data.privacy_notice),
    payload
  );
}

function buildHealthScoreContext(payload: CustomReportPayload) {
  const health_score = healthScoreForReportSelection(
    payload.data.period_rows,
    payload.data.periods,
    payload.periodSelection
  );
  const metrics = health_score.metrics;

  const metricsContext = metrics
    ? {
        overallScore: health_score.overall,
        savingsRatePct: metrics.savings_rate_pct,
        expenseConcentrationHhi: metrics.expense_concentration_hhi,
        topCategorySharePct: metrics.top_category_share_pct,
        expenseVolatilityPct: metrics.expense_volatility_pct,
        incomeVolatilityPct: metrics.income_volatility_pct,
        incomeStabilityScore: health_score.income_stability_score,
        expenseStabilityScore: health_score.expense_stability_score,
        nonEssentialOfExpensesPct: metrics.non_essential_of_expenses_pct,
        nonEssentialScore: health_score.non_essential_score,
      }
    : null;

  const healthScores = metrics
    ? {
        incomeStabilityScore: health_score.income_stability_score,
        expenseStabilityScore: health_score.expense_stability_score,
        nonEssentialScore: health_score.non_essential_score,
      }
    : null;

  const formatters = {
    formatIncome: payload.formatIncome,
    formatExpense: payload.formatExpense,
  };

  return { health_score, metrics, metricsContext, healthScores, formatters };
}

function buildHealthReport(payload: CustomReportPayload, context: PageContext) {
  const { health_score, metrics, metricsContext, healthScores, formatters } =
    buildHealthScoreContext(payload);
  const tone = scoreBandTone(health_score.overall);

  const factorCards = [
    buildFactorScorecardHtml(
      "Savings rate",
      health_score.savings_rate_score,
      Math.round(HEALTH_SCORE_WEIGHTS.savings_rate * 100)
    ),
    buildFactorScorecardHtml(
      "Income stability",
      health_score.income_stability_score,
      Math.round(HEALTH_SCORE_WEIGHTS.income_stability * 100)
    ),
    buildFactorScorecardHtml(
      "Expense stability",
      health_score.expense_stability_score,
      Math.round(HEALTH_SCORE_WEIGHTS.expense_stability * 100)
    ),
    buildFactorScorecardHtml(
      "Non-essential control",
      health_score.non_essential_score,
      Math.round(HEALTH_SCORE_WEIGHTS.non_essential * 100)
    ),
  ].join("");

  const metricsForYou =
    metrics && metricsContext && healthScores
      ? buildHealthMetricsForYouHtml(metricsContext, metrics, healthScores, formatters, {
          maxTips: 4,
        })
      : "";

  const body = `
    <div class="health-report-page report-keep-together">
      <div class="hero-zone hero-zone-compact health-report-hero">
        <div class="score-hero score-hero-compact score-hero-${tone}">
          <div class="score-hero-main">
            <div class="score-hero-value">${health_score.overall}</div>
            <div class="score-hero-band">${escapeHtml(scoreBandLabel(health_score.overall, "health"))}</div>
            <div class="score-hero-name">Financial health score</div>
            <p class="score-hero-summary">${escapeHtml(health_score.summary)}</p>
          </div>
          <div class="score-hero-factors">${factorCards}</div>
        </div>
      </div>
      ${metricsForYou}
    </div>
  `;

  return pageShell(
    context,
    "Financial health score",
    body,
    getReportPrivacyNotice(payload.data.privacy_notice),
    payload
  );
}

function buildBestFitReport(payload: CustomReportPayload, context: PageContext) {
  const { recommendations, baseCity } = payload;

  if (!recommendations.length) {
    const body = `<p class="muted-note">Run city comparison in the app to populate rankings.</p>`;
    return pageShell(
      context,
      "Best-fit cities by budget",
      body,
      getReportPrivacyNotice(payload.data.privacy_notice),
      payload
    );
  }

  const rows = recommendations
    .map(
      (entry, index) => `
    <tr class="${index % 2 === 0 ? "stripe" : ""}">
      <td>#${index + 1} ${escapeHtml(entry.city)}</td>
      <td>${payload.formatExpense(entry.referenceMonthlyCost)}</td>
      <td class="${entry.projectedBalance >= 0 ? "pos" : "neg"}">${entry.projectedBalance >= 0 ? "+" : ""}${payload.formatIncome(entry.projectedBalance)}</td>
      <td>${entry.score}/100</td>
      <td>${escapeHtml(entry.verdictLabel)}</td>
    </tr>`
    )
    .join("");

  const body = `
    <div class="hero-zone">
      ${buildKpiStripHtml([
        { label: "Top city", value: escapeHtml(recommendations[0].city), tone: "good" },
        {
          label: "Best balance",
          value: `${recommendations[0].projectedBalance >= 0 ? "+" : ""}${payload.formatIncome(recommendations[0].projectedBalance)}`,
          tone: "good",
        },
        { label: "Top score", value: `${recommendations[0].score}/100`, tone: "good" },
      ])}
    </div>
    <div class="section-block">
      <h2 class="section-title">City rankings</h2>
      <p class="muted-note">${baseCity ? `Compared from ${escapeHtml(baseCity)}.` : ""} Ranked by projected monthly balance.</p>
      <table class="index-table">
        <thead>
          <tr>
            <th>City</th>
            <th>Est. monthly cost</th>
            <th>Projected balance</th>
            <th>Score</th>
            <th>Verdict</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;

  return pageShell(
    context,
    "Best-fit cities by budget",
    body,
    getReportPrivacyNotice(payload.data.privacy_notice),
    payload
  );
}

function buildReportPages(types: CustomReportType[], payload: CustomReportPayload) {
  const builders: ((context: PageContext) => string)[] = [];

  for (const type of types) {
    if (type === "expenses-by-category") {
      builders.push((context) => buildExpensesTablePage(payload, context));
      continue;
    }
    if (type === "financial-health") {
      builders.push((context) => buildHealthReport(payload, context));
      builders.push((context) =>
        buildMerchantsAndCategoryChangesPage(payload, {
          ...context,
          showGeneratedAt: false,
        })
      );
      continue;
    }
    builders.push((context) => buildBestFitReport(payload, context));
  }

  const totalPages = builders.length;
  return builders.map((builder, index) =>
    builder({
      pageNumber: index + 1,
      totalPages,
      showGeneratedAt: index === 0,
    })
  );
}

export function buildCustomReportsHtml(types: CustomReportType[], payload: CustomReportPayload) {
  const pages = buildReportPages(types, payload);
  const title = `${REPORT_LABEL}: ${types.map((type) => CUSTOM_REPORT_LABELS[type]).join(", ")}`;
  return buildReportDocument(title, pages.join(""));
}

function reportFilename(types: CustomReportType[]) {
  const stamp = new Date().toISOString().slice(0, 10);
  const slug = types.length === 1 ? types[0] : "custom";
  return `${slug}-report-${stamp}.pdf`;
}

export async function downloadCustomReports(types: CustomReportType[], payload: CustomReportPayload) {
  const html = buildCustomReportsHtml(types, payload);
  await downloadReportPdf(html, reportFilename(types));
}

export async function exportCustomReports(types: CustomReportType[], payload: CustomReportPayload) {
  await downloadCustomReports(types, payload);
}
