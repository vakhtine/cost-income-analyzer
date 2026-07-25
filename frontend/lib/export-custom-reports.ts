import { CityRecommendation } from "@/lib/city-recommender";
import { getCategoryPdfSymbol } from "@/lib/category-icons";
import {
  buildReportDocument,
  buildReportPageShell,
  downloadReportPdf,
  escapeHtml,
  reportPreparedLine,
} from "@/lib/report-export";
import { getPeriodExpenseDateLabel, getReportPrivacyNotice } from "@/lib/report-dates";
import { healthScoreForPeriodSelection } from "@/lib/rebuild";
import { AnalyzeResponse, PeriodAnalysis } from "@/lib/types";

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
  privacyNotice: string
) {
  return buildReportPageShell({
    pageNumber: context.pageNumber,
    totalPages: context.totalPages,
    reportLabel: REPORT_LABEL,
    pageTitle: title,
    body,
    privacyNotice,
  });
}

function preparedBlock(
  payload: CustomReportPayload,
  showPreparedLine: boolean
) {
  if (!showPreparedLine) return "";
  return reportPreparedLine(
    payload.generatedAt,
    payload.periodLabel,
    payload.displayCurrency
  );
}

function healthScoreTone(score: number) {
  if (score >= 80) return "good";
  if (score >= 50) return "mid";
  return "low";
}

function buildExpensesTablePage(
  payload: CustomReportPayload,
  context: PageContext
) {
  const { periodAnalysis, periodLabel, data } = payload;
  const categories = periodAnalysis.expense_categories;
  const periodRows = data.period_rows[periodLabel] ?? Object.values(data.period_rows).flat();
  const expenseDateLabel = getPeriodExpenseDateLabel(periodRows, periodLabel);

  const rows = categories
    .map((item, index) => {
      const symbol = getCategoryPdfSymbol(item.category);
      return `
      <tr class="${index % 2 === 0 ? "stripe" : ""}">
        <td>${symbol} ${escapeHtml(item.category)}</td>
        <td>${item.count}</td>
        <td>${payload.formatExpense(item.total)}</td>
        <td>${item.pct_of_expenses?.toFixed(1) ?? "—"}%</td>
        <td>${item.pct_of_income.toFixed(1)}%</td>
      </tr>`;
    })
    .join("");

  const body = `
    ${preparedBlock(payload, context.showGeneratedAt)}
    <p class="section-explanation">${escapeHtml(expenseDateLabel)}.</p>
    <hr class="divider" />
    <div class="metric-grid">
      <div class="metric-card"><span>Total expenses</span><strong>${payload.formatExpense(periodAnalysis.total_expenses)}</strong></div>
      <div class="metric-card"><span>Total income</span><strong>${payload.formatIncome(periodAnalysis.total_income)}</strong></div>
      <div class="metric-card"><span>Categories tracked</span><strong>${categories.length}</strong></div>
    </div>
    <h2 class="section-title">Category breakdown</h2>
    <p class="section-explanation">${escapeHtml(expenseDateLabel)}.</p>
    <table class="index-table">
      <thead>
        <tr>
          <th>Category</th>
          <th>Txns</th>
          <th>Total</th>
          <th>% expenses</th>
          <th>% income</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
        <tr class="total-row">
          <td><strong>Total</strong></td>
          <td></td>
          <td><strong>${payload.formatExpense(periodAnalysis.total_expenses)}</strong></td>
          <td><strong>100%</strong></td>
          <td><strong>${periodAnalysis.total_income ? ((periodAnalysis.total_expenses / periodAnalysis.total_income) * 100).toFixed(1) : "—"}%</strong></td>
        </tr>
      </tbody>
    </table>
  `;

  return pageShell(
    context,
    "Expenses by category",
    body,
    getReportPrivacyNotice(payload.data.privacy_notice)
  );
}

function buildExpensesChartPage(
  payload: CustomReportPayload,
  context: PageContext
) {
  const { periodAnalysis } = payload;
  const categories = periodAnalysis.expense_categories;
  const maxTotal = Math.max(...categories.map((item) => item.total), 1);

  const bars = categories
    .slice(0, 10)
    .map((item) => {
      const width = Math.round((item.total / maxTotal) * 100);
      return `
      <div class="bar-chart-row">
        <span>${escapeHtml(item.category)}</span>
        <div class="bar-track"><div class="bar-fill" style="width:${width}%"></div></div>
        <strong>${payload.formatExpense(item.total)}</strong>
      </div>`;
    })
    .join("");

  const body = `
    <hr class="divider" />
    <h2 class="section-title">Top categories chart</h2>
    <div class="bar-chart-section">${bars}</div>
  `;

  return pageShell(
    context,
    "Expenses by category",
    body,
    getReportPrivacyNotice(payload.data.privacy_notice)
  );
}

function buildHealthReport(payload: CustomReportPayload, context: PageContext) {
  const health_score = healthScoreForPeriodSelection(
    payload.data.period_rows,
    payload.periodLabel
  );
  const metrics = health_score.metrics;

  const factors = [
    { label: "Savings rate", score: health_score.savings_rate_score, weight: 40, detail: health_score.details[0] },
    { label: "Income stability", score: health_score.income_stability_score, weight: 30, detail: health_score.details[1] },
    { label: "Non-essential control", score: health_score.non_essential_score, weight: 30, detail: health_score.details[2] },
  ]
    .map(
      (factor) => {
        const factorTone = healthScoreTone(factor.score);
        return `
    <div class="factor-row">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <strong>${escapeHtml(factor.label)}</strong>
        <span class="score-summary score-summary-${factorTone}">${factor.score}/100</span>
      </div>
      <div class="factor-track"><div class="factor-fill factor-fill-${factorTone}" style="width:${factor.score}%"></div></div>
      <p class="factor-detail">
        ${escapeHtml(factor.detail)}
      </p>
      <p class="section-note" style="margin:4px 0 0;">
        <strong>Weight:</strong> ${factor.weight}% of overall score.
        <strong>Contribution:</strong> ${((factor.score * factor.weight) / 100).toFixed(1)} / ${factor.weight} points
        (${factor.score}/100 × ${factor.weight}%).
      </p>
    </div>`;
      }
    )
    .join("");

  const metricsHtml = metrics
    ? `
    <div class="metric-grid">
      <div class="metric-card"><span>Savings rate</span><strong>${metrics.savings_rate_pct.toFixed(1)}%</strong></div>
      <div class="metric-card"><span>Total income</span><strong>${payload.formatIncome(metrics.total_income)}</strong></div>
      <div class="metric-card"><span>Total expenses</span><strong>${payload.formatExpense(metrics.total_expenses)}</strong></div>
      <div class="metric-card"><span>Net savings</span><strong>${payload.formatIncome(metrics.net_savings)}</strong></div>
      <div class="metric-card"><span>Expense / income</span><strong>${metrics.expense_to_income_ratio.toFixed(1)}%</strong></div>
      <div class="metric-card"><span>Non-essential</span><strong>${metrics.non_essential_of_expenses_pct.toFixed(1)}% of expenses</strong></div>
      <div class="metric-card"><span>Income sources</span><strong>${metrics.income_source_count}</strong></div>
      <div class="metric-card"><span>Periods analyzed</span><strong>${metrics.period_count}</strong></div>
      <div class="metric-card"><span>Income volatility</span><strong>${metrics.income_volatility_pct !== null ? `${metrics.income_volatility_pct.toFixed(1)}%` : "N/A"}</strong></div>
      <div class="metric-card"><span>Largest expense</span><strong>${escapeHtml(metrics.largest_expense_category)} (${payload.formatExpense(metrics.largest_expense_amount)})</strong></div>
      <div class="metric-card"><span>Expense volatility</span><strong>${metrics.expense_volatility_pct !== null ? `${metrics.expense_volatility_pct.toFixed(1)}%` : "N/A"}</strong></div>
      <div class="metric-card"><span>Avg daily spend</span><strong>${payload.formatExpense(metrics.avg_daily_spend)}</strong></div>
    </div>`
    : "";

  const tone = healthScoreTone(health_score.overall);

  const body = `
    ${preparedBlock(payload, context.showGeneratedAt)}
    <p class="section-explanation">Overall score combines savings rate (40%), income stability (30%), and non-essential spending (30%). This score reflects your spending habits — it is separate from relocation affordability (city cost fit).</p>
    <hr class="divider" />
    <div class="score-ring score-ring-${tone}">${health_score.overall}</div>
    <p class="score-ring-caption">Financial health score</p>
    <p class="section-explanation score-summary score-summary-${tone}" style="text-align:center;margin-bottom:4mm;">
      <strong>${escapeHtml(health_score.summary)}</strong>
    </p>
    ${metricsHtml}
    <h2 class="section-title">Score breakdown</h2>
    <p class="section-explanation">
      Overall financial health score = (Savings rate × 40%) + (Income stability × 30%) + (Non-essential control × 30%).
      Current overall: <strong>${health_score.overall}/100</strong>.
    </p>
    ${factors}
  `;

  return pageShell(
    context,
    "Financial health score",
    body,
    getReportPrivacyNotice(payload.data.privacy_notice)
  );
}

function buildBestFitReport(payload: CustomReportPayload, context: PageContext) {
  const { recommendations, baseCity } = payload;

  if (!recommendations.length) {
    const body = `
      ${preparedBlock(payload, context.showGeneratedAt)}
      <p class="section-explanation">Run city comparison in the app to populate rankings.</p>
      <p class="section-explanation">No city recommendations available yet.</p>
    `;
    return pageShell(
      context,
      "Best-fit cities by budget",
      body,
      getReportPrivacyNotice(payload.data.privacy_notice)
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
    ${preparedBlock(payload, context.showGeneratedAt)}
    <p class="section-explanation">
      ${baseCity ? `Compared against your spending from ${escapeHtml(baseCity)}.` : ""}
      Ranked by projected monthly balance.
    </p>
    <hr class="divider" />
    <table class="index-table">
      <thead>
        <tr>
          <th>City</th>
          <th>Est. monthly cost</th>
          <th>Projected balance</th>
          <th>Relocation affordability score</th>
          <th>Verdict</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <p class="section-explanation">
      Top pick: <strong>${escapeHtml(recommendations[0].city)}</strong> with projected balance
      ${recommendations[0].projectedBalance >= 0 ? "+" : ""}${payload.formatIncome(recommendations[0].projectedBalance)}.
    </p>
  `;

  return pageShell(
    context,
    "Best-fit cities by budget",
    body,
    getReportPrivacyNotice(payload.data.privacy_notice)
  );
}

function buildReportPages(
  types: CustomReportType[],
  payload: CustomReportPayload
) {
  const builders: ((context: PageContext) => string)[] = [];

  for (const type of types) {
    if (type === "expenses-by-category") {
      builders.push((context) => buildExpensesTablePage(payload, context));
      builders.push((context) => buildExpensesChartPage(payload, context));
      continue;
    }
    if (type === "financial-health") {
      builders.push((context) => buildHealthReport(payload, context));
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

export function buildCustomReportsHtml(
  types: CustomReportType[],
  payload: CustomReportPayload
) {
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
