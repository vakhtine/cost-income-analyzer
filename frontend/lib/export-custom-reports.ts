import { CityRecommendation } from "@/lib/city-recommender";
import { formatCategoryDisplayName, getCategoryPdfSymbol } from "@/lib/category-icons";
import { topMerchantsByCategoryMap } from "@/lib/category-merchants";
import {
  buildDonutChartHtml,
  buildFactorScorecardHtml,
  buildKpiStripHtml,
  buildReportIntroBlock,
  buildRoundedBarChartHtml,
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
import {
  buildMetricDefinitionsHtml,
  HEALTH_REPORT_METRICS,
  TREND_REPORT_METRICS,
} from "@/lib/report-metric-definitions";
import {
  adjacentPeriodPair,
  combinePeriodRowsInRange,
  computeCategoryTrends,
  computeCategoryVolatility,
  computeHerfindahlIndex,
  computePeriodExpenseTrends,
  detectAnomalies,
  expenseSpendType,
  slicePeriodOrder,
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
  payload: CustomReportPayload
) {
  const intro =
    context.showGeneratedAt
      ? buildReportIntroBlock(
          payload.generatedAt,
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
    meta: {
      generatedAt: payload.generatedAt,
      periodLabel: payload.periodLabel,
      displayCurrency: payload.displayCurrency,
    },
  });
}

function trendChangeClass(changePct: number) {
  if (Math.abs(changePct) >= 50) return "neg";
  return "";
}

function trendArrow(trend: string, changePct: number) {
  if (trend === "Spike" || changePct >= 50) return `+${changePct.toFixed(1)}% ▲ ${trend}`;
  if (changePct > 5) return `+${changePct.toFixed(1)}% ▲ Up`;
  if (changePct < -5) return `${changePct.toFixed(1)}% ▼ Down`;
  return `${changePct.toFixed(1)}% ▬ Stable`;
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

function buildTrendAnomalyPage(payload: CustomReportPayload, context: PageContext) {
  const { data } = payload;
  const focusPeriod = effectiveFocusPeriod(payload);
  const periodRows = effectivePeriodRows(payload);
  const merchantsMap = topMerchantsByCategoryMap(periodRows);
  const periodOrder = data.periods.filter((period) =>
    periodHasReportableData(data.period_rows[period] ?? [])
  );
  const trendPeriodOrder =
    payload.periodSelection.mode === "range"
      ? slicePeriodOrder(periodOrder, payload.periodSelection.start, payload.periodSelection.end).filter(
          (period) => periodHasReportableData(data.period_rows[period] ?? [])
        )
      : periodOrder;
  const hasMultiple = trendPeriodOrder.length >= 2;
  const trends = hasMultiple ? computeCategoryTrends(data.period_rows, periodOrder, focusPeriod) : null;
  const volatility = hasMultiple ? computeCategoryVolatility(data.period_rows, periodOrder) : [];
  const anomalies = detectAnomalies(data.period_rows, periodOrder, focusPeriod);
  const periodTrends = computePeriodExpenseTrends(data.period_rows, trendPeriodOrder);
  const periodPair = adjacentPeriodPair(periodOrder, focusPeriod);
  const thisPeriodHeader = periodPair
    ? `This period (${periodPair.currentPeriod})`
    : "This period";
  const priorPeriodHeader = periodPair
    ? `Prior period (${periodPair.priorPeriod})`
    : "Prior period";

  const trendRows = trends
    ? trends
        .slice(0, 8)
        .map((item, index) => {
          const symbol = getCategoryPdfSymbol(item.category);
          return `
      <tr class="${index % 2 === 0 ? "stripe" : ""}">
        <td>${formatCategoryCell(item.category, merchantsMap.get(item.category), symbol)}</td>
        <td>${payload.formatExpense(item.current_total)}</td>
        <td>${payload.formatExpense(item.prior_total)}</td>
        <td class="${trendChangeClass(item.change_pct)}">${trendArrow(item.trend, item.change_pct)}</td>
      </tr>`;
        })
        .join("")
    : "";

  const volatilityRows = volatility
    .slice(0, 6)
    .map((item, index) => {
      const symbol = getCategoryPdfSymbol(item.category);
      return `
    <tr class="${index % 2 === 0 ? "stripe" : ""}">
      <td>${formatCategoryCell(item.category, merchantsMap.get(item.category), symbol)}</td>
      <td class="${item.volatility_pct > 50 && item.avg_total >= 50 ? "neg" : ""}">${item.volatility_pct.toFixed(1)}%</td>
      <td>${payload.formatExpense(item.avg_total)}</td>
    </tr>`;
    })
    .join("");

  const anomalyRows = anomalies.anomalies
    .slice(0, 6)
    .map(
      (item, index) => `
    <tr class="${index % 2 === 0 ? "stripe" : ""}">
      <td>${escapeHtml(item.merchant_name)}${item.transaction_count > 1 ? ` (${item.transaction_count} txns)` : ""}</td>
      <td>${escapeHtml(formatCategoryDisplayName(item.category))}</td>
      <td>${payload.formatExpense(item.amount)} ⚠</td>
      <td>${escapeHtml(item.description)}</td>
    </tr>`
    )
    .join("");

  const popRows = periodTrends
    .map(
      (item, index) => `
    <tr class="${index % 2 === 0 ? "stripe" : ""}">
      <td>${escapeHtml(item.period)}</td>
      <td>${payload.formatExpense(item.total_expenses)}</td>
      <td class="${item.change_pct !== null && Math.abs(item.change_pct) >= 50 ? "neg" : ""}">${item.change_pct !== null ? `${item.change_pct >= 0 ? "+" : ""}${item.change_pct.toFixed(1)}%` : "—"}</td>
    </tr>`
    )
    .join("");

  const body = `
    <div class="section-block">
      <h2 class="section-title">Period-over-period trend</h2>
      ${
        hasMultiple
          ? `<table class="index-table compact">
               <thead><tr><th>Period</th><th>Total expenses</th><th>Change</th></tr></thead>
               <tbody>${popRows}</tbody>
             </table>`
          : `<p class="muted-note">Upload more than one month to unlock period-over-period trends.</p>`
      }
    </div>
    ${
      trends?.length
        ? `<div class="section-block section-block-loose">
             <h2 class="section-title">Expenses category trend</h2>
             <table class="index-table">
               <thead><tr><th>Expenses category</th><th>${escapeHtml(thisPeriodHeader)}</th><th>${escapeHtml(priorPeriodHeader)}</th><th>Change</th></tr></thead>
               <tbody>${trendRows}</tbody>
             </table>
           </div>`
        : ""
    }
    ${
      volatility.length
        ? `<div class="section-block section-block-loose">
             <h2 class="section-title">Expenses category volatility (month to month)</h2>
             <table class="index-table compact">
               <thead><tr><th>Expenses category</th><th>Volatility (CV)</th><th>Avg monthly spend</th></tr></thead>
               <tbody>${volatilityRows}</tbody>
             </table>
           </div>`
        : ""
    }
    <div class="section-block details-section">
      <h2 class="section-title">Anomaly flags</h2>
      ${
        anomalies.anomalies.length
          ? `<table class="index-table">
               <thead><tr><th>Merchant</th><th>Expenses category</th><th>Amount</th><th>Flag</th></tr></thead>
               <tbody>${anomalyRows}</tbody>
             </table>
             <p class="muted-note">${anomalies.anomalies.length} flagged of ${anomalies.total_transactions} transactions. Compared to your own past spending — not market averages.</p>`
          : `<p class="muted-note">No statistical outliers detected for ${escapeHtml(focusPeriod)}. Flags compare spending to your own past months — not market averages.</p>`
      }
    </div>
    ${buildMetricDefinitionsHtml(TREND_REPORT_METRICS)}
  `;

  return pageShell(
    context,
    "Trend & anomaly view",
    body,
    getReportPrivacyNotice(payload.data.privacy_notice),
    payload
  );
}

function buildTopCategoriesVisuals(payload: CustomReportPayload) {
  const topCategories = payload.periodAnalysis.expense_categories.slice(0, 5);
  const donut = buildDonutChartHtml(
    topCategories.map((item) => ({
      label: item.category,
      value: item.total,
      symbol: getCategoryPdfSymbol(item.category),
    })),
    payload.formatExpense
  );

  const bars = buildRoundedBarChartHtml(
    topCategories.map((item) => ({
      label: item.category,
      value: item.total,
      symbol: getCategoryPdfSymbol(item.category),
    })),
    payload.formatExpense
  );

  return `
    <div class="chart-panel-grid">
      <div class="chart-panel">
        <h2 class="section-title">Top 5 expenses categories</h2>
        ${donut}
      </div>
      <div class="chart-panel">
        <h2 class="section-title">Share by amount</h2>
        ${bars}
      </div>
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
        <td>${item.pct_of_expenses?.toFixed(1) ?? "—"}%</td>
        <td><span class="type-pill type-pill-${spendType.toLowerCase()}">${spendType}</span></td>
      </tr>`;
    })
    .join("");

  const body = `
    <div class="hero-zone">
      ${buildKpiStripHtml([
        { label: "Total expenses", value: payload.formatExpense(periodAnalysis.total_expenses) },
        { label: "Total income", value: payload.formatIncome(periodAnalysis.total_income) },
        { label: "Income/expenses categories tracked", value: String(categories.length) },
      ])}
      ${buildTopCategoriesVisuals(payload)}
    </div>
    <div class="details-section">
      <h2 class="section-title">Top 5 expenses category summary</h2>
      <p class="muted-note">${escapeHtml(expenseDateLabel)}</p>
      <table class="index-table">
        <thead>
          <tr>
            <th>Expenses category</th>
            <th>Txns</th>
            <th>Total</th>
            <th>% expenses</th>
            <th>Type</th>
          </tr>
        </thead>
        <tbody>${topRows}</tbody>
      </table>
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

function buildHealthReport(payload: CustomReportPayload, context: PageContext) {
  const health_score = healthScoreForReportSelection(
    payload.data.period_rows,
    payload.data.periods,
    payload.periodSelection
  );
  const metrics = health_score.metrics;
  const tone = scoreBandTone(health_score.overall);
  const periodRows = effectivePeriodRows(payload);
  const merchantsMap = topMerchantsByCategoryMap(periodRows);
  const concentration = computeHerfindahlIndex(
    payload.periodAnalysis.expense_categories,
    payload.periodAnalysis.total_expenses
  );

  const recurringRows = payload.periodAnalysis.expense_categories.filter(
    (item) => expenseSpendType(item.category) === "RECURRING"
  );
  const variableRows = payload.periodAnalysis.expense_categories.filter(
    (item) => expenseSpendType(item.category) === "VARIABLE"
  );
  const recurringTotal = recurringRows.reduce((sum, item) => sum + item.total, 0);
  const variableTotal = variableRows.reduce((sum, item) => sum + item.total, 0);

  const structureRows = payload.periodAnalysis.expense_categories
    .map((item, index) => {
      const spendType = expenseSpendType(item.category);
      const symbol = getCategoryPdfSymbol(item.category);
      return `
      <tr class="${index % 2 === 0 ? "stripe" : ""}">
        <td>${formatCategoryCell(item.category, merchantsMap.get(item.category), symbol)}</td>
        <td><span class="type-pill type-pill-${spendType.toLowerCase()}">${spendType}</span></td>
        <td>${payload.formatExpense(item.total)}</td>
        <td>${item.pct_of_expenses?.toFixed(1) ?? "—"}%</td>
      </tr>`;
    })
    .join("");

  const factorCards = [
    buildFactorScorecardHtml("Savings rate", health_score.savings_rate_score, 40),
    buildFactorScorecardHtml("Income stability", health_score.income_stability_score, 30),
    buildFactorScorecardHtml("Non-essential control", health_score.non_essential_score, 30),
  ].join("");

  const quickStats = metrics
    ? buildKpiStripHtml([
        { label: "Savings rate", value: `${metrics.savings_rate_pct.toFixed(1)}%`, tone: "good" },
        { label: "Net savings", value: payload.formatIncome(metrics.net_savings) },
        { label: "Expense / income", value: `${metrics.expense_to_income_ratio.toFixed(1)}%` },
      ])
    : "";

  const body = `
    <div class="hero-zone">
      <div class="score-hero score-hero-${tone}">
        <div class="score-hero-main">
          <div class="score-hero-value">${health_score.overall}</div>
          <div class="score-hero-band">${escapeHtml(scoreBandLabel(health_score.overall, "health"))}</div>
          <div class="score-hero-name">Financial health score</div>
          <p class="score-hero-summary">${escapeHtml(health_score.summary)}</p>
        </div>
        <div class="score-hero-factors">${factorCards}</div>
      </div>
    </div>
    ${quickStats}
    <div class="details-section">
      <h2 class="section-title">Supporting metrics</h2>
      ${
        metrics
          ? `<div class="metric-grid">
              <div class="metric-card"><span>HHI (expenses categories)</span><strong>${metrics.expense_concentration_hhi.toFixed(2)}</strong></div>
              <div class="metric-card"><span>Top expenses category share</span><strong>${metrics.top_category_share_pct.toFixed(1)}%</strong></div>
              <div class="metric-card"><span>Avg daily spend</span><strong>${payload.formatExpense(metrics.avg_daily_spend)}</strong></div>
              <div class="metric-card"><span>Expense volatility (month to month)</span><strong>${metrics.expense_volatility_pct !== null ? `${metrics.expense_volatility_pct.toFixed(1)}%` : "N/A"}</strong></div>
            </div>`
          : ""
      }
    </div>
    <div class="section-block">
      <h2 class="section-title">Concentration</h2>
      <div class="metric-grid">
        <div class="metric-card"><span>Concentration index (HHI, expenses categories)</span><strong>${concentration.hhi.toFixed(2)} / 1.0</strong></div>
        <div class="metric-card"><span>Top expenses category share</span><strong>${concentration.top_category_share_pct.toFixed(1)}%</strong></div>
        <div class="metric-card"><span>Income/expenses categories tracked</span><strong>${concentration.category_count}</strong></div>
      </div>
      <p class="muted-note">${escapeHtml(concentration.interpretation)}</p>
    </div>
    <div class="section-block section-block-loose">
      <h2 class="section-title">Recurring vs one-off</h2>
      <table class="index-table">
        <thead>
          <tr><th>Expenses category</th><th>Type</th><th>Total</th><th>% of expenses</th></tr>
        </thead>
        <tbody>${structureRows}</tbody>
      </table>
      <p class="muted-note">
        Recurring ${payload.formatExpense(recurringTotal)} · Variable ${payload.formatExpense(variableTotal)}
      </p>
    </div>
    ${buildMetricDefinitionsHtml(HEALTH_REPORT_METRICS)}
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
      builders.push((context) => buildTrendAnomalyPage(payload, context));
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
