import { CityRecommendation } from "@/lib/city-recommender";
import { analyzeTransactions, top5ExpenseCategories } from "@/lib/analyzer";
import { formatCategoryDisplayName, getCategoryPdfSymbol } from "@/lib/category-icons";
import { canonicalExpenseCategory } from "@/lib/category-normalize";
import { topMerchantsByCategoryMap } from "@/lib/category-merchants";
import { buildCategoryChangeExplanations, topMerchantsForPeriod } from "@/lib/report-insights";
import {
  buildFactorScorecardHtml,
  buildDonutChartHtml,
  buildHealthReportPeriodMetaHtml,
  buildKpiStripHtml,
  buildRelocationPageHeaderHtml,
  buildReportIntroBlock,
  buildScoreStampHtml,
  buildVerticalRankChartHtml,
  scoreBandLabel,
  scoreBandTone,
} from "@/lib/report-charts";
import {
  formatHealthReportPeriodLabel,
  getPeriodExpenseDateLabel,
  getReportPrivacyNotice,
} from "@/lib/report-dates";
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
  computeCategoryVolatility,
  detectAnomalies,
  expenseSpendType,
  slicePeriodOrder,
} from "@/lib/spending-metrics";
import { UI_LABELS } from "@/lib/ui-labels";
import { periodHasReportableData } from "@/lib/transaction-filters";
import { AnalyzeResponse, PeriodAnalysis, PeriodReportSelection } from "@/lib/types";
import {
  buildAboutBestFitCityPage,
  buildFinancialHealthRelocationFitPage,
  buildRelocationOverviewPageBuilders,
  buildSpendingVsBestFitPageBuilders,
  ReportPayload,
} from "@/lib/export-relocation-report";

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

export const CUSTOM_REPORT_TYPE_ORDER: CustomReportType[] = [
  "expenses-by-category",
  "financial-health",
  "best-fit-cities",
];

function sortCustomReportTypes(types: CustomReportType[]) {
  return [...types].sort(
    (a, b) => CUSTOM_REPORT_TYPE_ORDER.indexOf(a) - CUSTOM_REPORT_TYPE_ORDER.indexOf(b)
  );
}

export type CustomReportPayload = {
  generatedAt: string;
  periodLabel: string;
  periodSelection: PeriodReportSelection;
  baseCity?: string;
  displayCurrency: string;
  data: AnalyzeResponse;
  periodAnalysis: PeriodAnalysis;
  recommendations: CityRecommendation[];
  relocation?: ReportPayload;
  formatIncome: (amount: number) => string;
  formatExpense: (amount: number) => string;
};

type PageContext = {
  pageNumber: number;
  totalPages: number;
  showGeneratedAt: boolean;
  /** Period / currency / lifestyle meta — first page of the full custom report only. */
  showHeaderMeta?: boolean;
};

const REPORT_LABEL = "Custom financial report";

function reportHeaderPeriodLabel(payload: CustomReportPayload): string {
  if (payload.periodSelection.mode === "single") {
    return payload.periodLabel;
  }

  const rangePeriods = slicePeriodOrder(
    payload.data.periods,
    payload.periodSelection.start,
    payload.periodSelection.end
  ).filter((period) => periodHasReportableData(payload.data.period_rows[period] ?? []));

  if (rangePeriods.length <= 1) {
    return payload.periodLabel;
  }

  return formatHealthReportPeriodLabel(payload.periodLabel, rangePeriods.length);
}

function pageShell(
  context: PageContext,
  title: string,
  body: string,
  privacyNotice: string,
  payload: CustomReportPayload,
  options?: {
    pageBreakBefore?: boolean;
    pageSubtitle?: string;
    useRelocationHeader?: boolean;
    pageAutoFit?: boolean;
    pageContentClass?: string;
  }
) {
  const displayPeriodLabel = reportHeaderPeriodLabel(payload);
  const relocation = payload.relocation;
  let intro = "";
  if (context.showHeaderMeta) {
    if (options?.useRelocationHeader && relocation) {
      intro = buildRelocationPageHeaderHtml(
        displayPeriodLabel,
        payload.displayCurrency,
        relocation,
        {
          privacyNotice,
          showPrivacyBanner: context.showGeneratedAt,
        }
      );
    } else if (context.showGeneratedAt) {
      intro = buildReportIntroBlock(
        displayPeriodLabel,
        payload.displayCurrency,
        privacyNotice,
        undefined,
        undefined
      );
    } else {
      intro = buildHealthReportPeriodMetaHtml(
        displayPeriodLabel,
        payload.displayCurrency,
        undefined
      );
    }
  }

  return buildReportPageShell({
    pageNumber: context.pageNumber,
    totalPages: context.totalPages,
    reportLabel: REPORT_LABEL,
    pageTitle: title,
    pageSubtitle: options?.pageSubtitle,
    body: `${intro}${body}`,
    privacyNotice,
    showPrivacy: false,
    pageBreakBefore: options?.pageBreakBefore,
    pageAutoFit: options?.pageAutoFit,
    pageContentClass: options?.pageContentClass,
    meta: {
      periodLabel: displayPeriodLabel,
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

function trendChangeClass(item: { change_pct: number | null; is_new: boolean }) {
  if (item.is_new) return "category-change-new";
  if (item.change_pct === null) return "";
  if (item.change_pct < -5) return "pos";
  if (item.change_pct > 5) return "neg";
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

function effectiveRangePeriods(payload: CustomReportPayload) {
  if (payload.periodSelection.mode !== "range") return [];
  return slicePeriodOrder(
    payload.data.periods,
    payload.periodSelection.start,
    payload.periodSelection.end
  ).filter((period) => periodHasReportableData(payload.data.period_rows[period] ?? []));
}

function isMultiPeriodRangeReport(payload: CustomReportPayload) {
  return effectiveRangePeriods(payload).length > 1;
}

function formatCategorySymbolBadge(symbol: string): string {
  return `<span class="category-pdf-symbol">${escapeHtml(symbol)}</span>`;
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
  return `<span class="category-label-with-symbol">${formatCategorySymbolBadge(symbol)}<span>${escapeHtml(formatCategoryDisplayName(category))}</span></span>${merchantNote}`;
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

function hasPriorMonthCategoryChanges(payload: CustomReportPayload) {
  const { trends, periodPair } = buildTrendContext(payload);
  return Boolean(trends?.length && periodPair);
}

function buildTrendOverviewSection(payload: CustomReportPayload) {
  const { trends, periodPair } = buildTrendContext(payload);
  const { data } = payload;

  if (!trends?.length || !periodPair) {
    return `<p class="muted-note">Upload more than one month to unlock category change explanations.</p>`;
  }

  return `<table class="index-table report-table-styled category-changes-table-large">
     <thead><tr><th>${escapeHtml(UI_LABELS.expensesCategory)}</th><th>Explanation</th></tr></thead>
     <tbody>${buildCategoryChangeExplanations(trends, data.period_rows, periodPair.currentPeriod, periodPair.priorPeriod, 5, payload.formatExpense)
       .map(
         (item, index) => `
       <tr class="${index % 2 === 0 ? "stripe" : ""}">
         <td>
           ${escapeHtml(formatCategoryDisplayName(item.category))}
           ${item.is_new ? `<span class="type-pill type-pill-new" style="display:inline-block;margin-left:8px;padding:2px 6px;border-radius:999px;font-size:8px;font-weight:700;background:#dbeafe;color:#1e40af;">New</span>` : ""}
         </td>
         <td class="${trendChangeClass(item)}"${item.is_new ? ` style="color:#1e40af;font-weight:600;"` : ""}>${escapeHtml(item.explanation)}</td>
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
    ? `<p class="report-explanatory-callout"><strong>Top merchant — Mortgage payment</strong> is your largest expense merchant and category (<strong>${escapeHtml(allMerchants[0].label)}</strong>, ${payload.formatExpense(allMerchants[0].value)}). It is excluded from the chart below; remaining merchants are ranked #2–#${chartMerchants.length + 1}.</p>`
    : "";

  const chartHtml = buildVerticalRankChartHtml(
    chartMerchants.map((item) => ({
      label: item.label,
      value: item.value,
      sublabel: formatCategoryDisplayName(item.category),
    })),
    {
      rankStart: topIsMortgage ? 2 : 1,
      formatValue: (value) => payload.formatExpense(value),
    }
  );

  const showCategoryChanges = hasPriorMonthCategoryChanges(payload);

  const body = `
    ${reportTableCard(
      UI_LABELS.topMerchantsByExpenseCategory,
      "Highest-spend merchants ranked by total for this period (bar height = relative spend).",
      `${mortgageCallout}${chartHtml}`,
      true
    )}
    ${
      showCategoryChanges
        ? reportTableCard(
            "Category changes",
            "Compared with the previous month — shifts and the merchants that drove the biggest changes.",
            buildTrendOverviewSection(payload),
            true
          )
        : ""
    }
  `;

  return pageShell(
    context,
    showCategoryChanges ? "Merchants & category changes" : "Merchants",
    body,
    getReportPrivacyNotice(payload.data.privacy_notice),
    payload,
    { pageBreakBefore: true }
  );
}

function buildExpensesPeriodAnalysis(payload: CustomReportPayload) {
  return analyzeTransactions(effectivePeriodRows(payload));
}

function buildTopCategoriesVisuals(payload: CustomReportPayload) {
  const periodAnalysis = buildExpensesPeriodAnalysis(payload);
  const topCategories = top5ExpenseCategories(periodAnalysis);
  const totalExpenses = periodAnalysis.total_expenses || 0;

  const items = topCategories.map((item) => ({
    label: formatCategoryDisplayName(item.category),
    value: item.total,
    symbol: getCategoryPdfSymbol(item.category),
    sharePct: item.pct_of_all_expenses,
  }));

  return buildDonutChartHtml(items, payload.formatExpense, {
    embedded: true,
    stacked: true,
    shareDenominator: totalExpenses,
    centerTitle: "Expenses",
    shareLabel: "",
  });
}

function buildTopCategoriesIncomeVisuals(payload: CustomReportPayload) {
  const periodAnalysis = buildExpensesPeriodAnalysis(payload);
  const topCategories = top5ExpenseCategories(periodAnalysis);
  const totalIncome = periodAnalysis.total_income || 0;

  const items = topCategories.map((item) => ({
    label: formatCategoryDisplayName(item.category),
    value: item.total,
    symbol: getCategoryPdfSymbol(item.category),
    sharePct: item.pct_of_income_top5,
  }));

  return buildDonutChartHtml(items, payload.formatExpense, {
    embedded: true,
    stacked: true,
    shareDenominator: totalIncome,
    centerTitle: "Income",
    shareLabel: "",
  });
}

function buildExpensesTablePage(payload: CustomReportPayload, context: PageContext) {
  const periodAnalysis = buildExpensesPeriodAnalysis(payload);
  const { periodLabel } = payload;
  const topCategories = top5ExpenseCategories(periodAnalysis);
  const periodRows = effectivePeriodRows(payload);
  const expenseDateLabel = getPeriodExpenseDateLabel(periodRows, periodLabel);
  const merchantsMap = topMerchantsByCategoryMap(periodRows);

  const topRows = topCategories
    .map((item, index) => {
      const symbol = getCategoryPdfSymbol(item.category);
      const spendType = expenseSpendType(item.category);
      const merchantKey = canonicalExpenseCategory(item.category);
      return `
      <tr class="${index % 2 === 0 ? "stripe" : ""}">
        <td>${formatCategoryCell(item.category, merchantsMap.get(merchantKey), symbol)}</td>
        <td>${item.count}</td>
        <td>${payload.formatExpense(item.total)}</td>
        <td class="pct-cell-center">${item.pct_of_all_expenses.toFixed(1)}%</td>
        <td class="pct-cell-center">${item.pct_of_income_top5.toFixed(1)}%</td>
        <td><span class="type-pill type-pill-${spendType.toLowerCase()}">${spendType}</span></td>
      </tr>`;
    })
    .join("");

  const top5Total = topCategories.reduce((sum, item) => sum + item.total, 0);
  const otherCategoryCount = periodAnalysis.expense_categories.length - topCategories.length;
  const top5Footnote =
    otherCategoryCount > 0
      ? `<p class="muted-note">Top 5 shown (${payload.formatExpense(top5Total)}); ${otherCategoryCount} additional smaller ${otherCategoryCount === 1 ? "category" : "categories"} account for the remaining ${payload.formatExpense(periodAnalysis.total_expenses - top5Total)} in total expenses.</p>`
      : "";

  const body = `
    <div class="expenses-category-page">
      ${reportTableCard(
        UI_LABELS.top5ExpenseCategorySummary,
        escapeHtml(expenseDateLabel),
        `<table class="index-table report-table-styled expenses-top5-table">
        <thead>
          <tr>
            <th>${escapeHtml(UI_LABELS.expensesCategory)}</th>
            <th>Txns</th>
            <th>Total</th>
            <th class="pct-cell-center">% of all expenses</th>
            <th class="pct-cell-center">% of income</th>
            <th>Type</th>
          </tr>
        </thead>
        <tbody>${topRows}</tbody>
      </table>
      ${top5Footnote}
      <div class="expenses-summary-visuals">
        <div class="expenses-charts-duo">
          <div class="expenses-chart-panel">
            <h3 class="subsection-title">${escapeHtml(UI_LABELS.expensesByCategory)}</h3>
            ${buildTopCategoriesVisuals(payload)}
          </div>
          <div class="expenses-chart-panel">
            <h3 class="subsection-title">${escapeHtml(UI_LABELS.top5ExpensesPctOfIncome)}</h3>
            ${buildTopCategoriesIncomeVisuals(payload)}
          </div>
        </div>
        ${buildKpiStripHtml(
          [
            { label: "Total expenses", value: payload.formatExpense(periodAnalysis.total_expenses) },
            { label: "Total income", value: payload.formatIncome(periodAnalysis.total_income) },
            {
              label: UI_LABELS.categoriesTracked,
              value: String(periodAnalysis.expense_categories.length),
            },
          ],
          { className: "kpi-strip-expenses" }
        )}
      </div>`,
        false
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

function buildMultiPeriodAnalysisPageBuilders(
  payload: CustomReportPayload
): ((context: PageContext) => string)[] {
  const privacyNotice = getReportPrivacyNotice(payload.data.privacy_notice);
  const rangePeriods = effectiveRangePeriods(payload);
  const periodAnalysis = buildExpensesPeriodAnalysis(payload);
  const { health_score } = buildHealthScoreContext(payload);
  const metrics = health_score.metrics;

  const periodRows = rangePeriods
    .map((period) => {
      const analysis = payload.data.period_analysis[period] ?? analyzeTransactions(
        payload.data.period_rows[period] ?? []
      );
      return `
        <tr>
          <th scope="row">${escapeHtml(period)}</th>
          <td>${payload.formatIncome(analysis.total_income)}</td>
          <td>${payload.formatExpense(analysis.total_expenses)}</td>
          <td>${payload.formatIncome(analysis.net_savings)}</td>
          <td>${analysis.savings_rate.toFixed(1)}%</td>
        </tr>`;
    })
    .join("");

  const volatility = computeCategoryVolatility(payload.data.period_rows, rangePeriods)
    .filter((item) => item.avg_total >= 25)
    .slice(0, 5);

  const volatilityRows = volatility.length
    ? volatility
        .map(
          (item, index) => `
        <tr class="${index % 2 === 0 ? "stripe" : ""}">
          <td>${escapeHtml(formatCategoryDisplayName(item.category))}</td>
          <td>${payload.formatExpense(item.avg_total)}</td>
          <td class="pct-cell-center">${item.volatility_pct.toFixed(1)}%</td>
        </tr>`
        )
        .join("")
    : `<tr><td colspan="3" class="muted-note">Not enough category history to rank volatility.</td></tr>`;

  const stabilitySection =
    metrics && (metrics.income_volatility_pct !== null || metrics.expense_volatility_pct !== null)
      ? reportTableCard(
          "Income & expense stability across the range",
          "Volatility is measured across included months — lower is steadier.",
          `<table class="index-table report-table-styled">
            <tbody>
              <tr class="stripe">
                <th scope="row">Income volatility</th>
                <td>${metrics.income_volatility_pct !== null ? `${metrics.income_volatility_pct.toFixed(1)}%` : "—"}</td>
              </tr>
              <tr>
                <th scope="row">Expense volatility</th>
                <td>${metrics.expense_volatility_pct !== null ? `${metrics.expense_volatility_pct.toFixed(1)}%` : "—"}</td>
              </tr>
              <tr class="stripe">
                <th scope="row">Financial health score (range)</th>
                <td>${health_score.overall.toFixed(1)}</td>
              </tr>
            </tbody>
          </table>`,
          true
        )
      : "";

  const multiPeriodBody = `
    <div class="multi-period-report-page">
      ${reportTableCard(
        "Period-by-period summary",
        `Income, expenses, and savings for each month in ${escapeHtml(payload.periodLabel)}.`,
        `<table class="index-table report-table-styled multi-period-summary-table">
          <thead>
            <tr>
              <th>Period</th>
              <th>Income</th>
              <th>Expenses</th>
              <th>Net savings</th>
              <th>Savings rate</th>
            </tr>
          </thead>
          <tbody>${periodRows}</tbody>
        </table>`,
        true
      )}
      ${buildKpiStripHtml(
        [
          {
            label: "Combined income",
            value: payload.formatIncome(periodAnalysis.total_income),
          },
          {
            label: "Combined expenses",
            value: payload.formatExpense(periodAnalysis.total_expenses),
          },
          {
            label: "Combined net savings",
            value: payload.formatIncome(periodAnalysis.net_savings),
          },
          {
            label: "Avg monthly savings rate",
            value: `${periodAnalysis.savings_rate.toFixed(1)}%`,
          },
        ],
        { className: "kpi-strip-multi-period" }
      )}
      ${stabilitySection}
      ${reportTableCard(
        "Most volatile expense categories",
        "Categories with the highest month-to-month swing (coefficient of variation) in this range.",
        `<table class="index-table report-table-styled">
          <thead>
            <tr>
              <th>${escapeHtml(UI_LABELS.expensesCategory)}</th>
              <th>Avg monthly spend</th>
              <th class="pct-cell-center">Volatility (CV)</th>
            </tr>
          </thead>
          <tbody>${volatilityRows}</tbody>
        </table>`,
        true
      )}
    </div>`;

  const pageOptions = {
    pageBreakBefore: true as const,
    pageContentClass: "page-content-multi-period",
  };

  return [
    (context: PageContext) =>
      pageShell(context, "Multi-period analysis", multiPeriodBody, privacyNotice, payload, pageOptions),
  ];
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
        savingsRateScore: health_score.savings_rate_score,
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

  return {
    health_score,
    metrics,
    metricsContext,
    healthScores,
    formatters,
  };
}

function buildHealthReportPage(payload: CustomReportPayload, context: PageContext) {
  const { health_score, metrics, metricsContext, healthScores, formatters } =
    buildHealthScoreContext(payload);
  const tone = scoreBandTone(health_score.overall);

  const factorCards = [
    buildFactorScorecardHtml(
      "Savings rate score",
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
      "Non-essential spending control",
      health_score.non_essential_score,
      Math.round(HEALTH_SCORE_WEIGHTS.non_essential * 100)
    ),
  ].join("");

  const metricsForYou =
    metrics && metricsContext && healthScores
      ? buildHealthMetricsForYouHtml(metricsContext, metrics, healthScores, formatters, {
          maxTips: 2,
          compactTable: true,
          pdf: true,
          layoutClass: " health-metrics-detail-page",
        })
      : "";

  const body = `
    <div class="health-report-page health-report-page-fit report-keep-together">
      <div class="health-report-score-block">
        <div class="hero-zone hero-zone-compact health-report-hero">
          <div class="score-hero score-hero-compact score-hero-${tone}">
            <div class="score-hero-main">
              ${buildScoreStampHtml(health_score.overall, "health")}
              <div class="score-hero-name">Financial health score</div>
            </div>
            <div class="score-hero-factors score-hero-factors-compact">${factorCards}</div>
          </div>
        </div>
      </div>
      ${
        metricsForYou
          ? `<div class="health-report-metrics-block">${metricsForYou}</div>`
          : `<p class="muted-note">No supporting metrics available for this period.</p>`
      }
    </div>
  `;

  return pageShell(
    context,
    "Financial health score",
    body,
    getReportPrivacyNotice(payload.data.privacy_notice),
    payload,
    { pageAutoFit: true }
  );
}

function resolveExportTypes(types: CustomReportType[], payload: CustomReportPayload) {
  const resolved = sortCustomReportTypes([...types]);
  const hasRelocationData =
    (payload.relocation?.citySummaries?.length ?? 0) > 0 ||
    (payload.relocation?.compositeEntries?.length ?? 0) > 0 ||
    payload.recommendations.length > 0;
  if (hasRelocationData && !resolved.includes("best-fit-cities")) {
    resolved.push("best-fit-cities");
  }
  return sortCustomReportTypes(resolved);
}

function buildReportPages(types: CustomReportType[], payload: CustomReportPayload) {
  const effectiveTypes = resolveExportTypes(types, payload);
  const builders: ((context: PageContext) => string)[] = [];

  const includeMultiPeriodPage =
    isMultiPeriodRangeReport(payload) &&
    (effectiveTypes.includes("expenses-by-category") ||
      effectiveTypes.includes("financial-health"));
  let multiPeriodPageAdded = false;

  for (const type of effectiveTypes) {
    if (type === "expenses-by-category") {
      builders.push((context) => buildExpensesTablePage(payload, context));
      if (includeMultiPeriodPage) {
        builders.push(...buildMultiPeriodAnalysisPageBuilders(payload));
        multiPeriodPageAdded = true;
      }
      continue;
    }
    if (type === "financial-health") {
      if (includeMultiPeriodPage && !multiPeriodPageAdded) {
        builders.push(...buildMultiPeriodAnalysisPageBuilders(payload));
        multiPeriodPageAdded = true;
      }
      builders.push((context) => buildHealthReportPage(payload, context));
      builders.push((context) =>
        buildMerchantsAndCategoryChangesPage(payload, {
          ...context,
          showGeneratedAt: false,
        })
      );
      continue;
    }
    const relocation = payload.relocation ?? fallbackRelocationPayload(payload);
    builders.push(
      ...buildRelocationOverviewPageBuilders(relocation).map((builder) => (context: PageContext) =>
        builder({
          ...context,
          reportLabel: REPORT_LABEL,
        })
      )
    );
    builders.push((context) =>
      buildFinancialHealthRelocationFitPage(relocation, {
        ...context,
        reportLabel: REPORT_LABEL,
      })
    );
    builders.push(
      ...buildSpendingVsBestFitPageBuilders(relocation).map((builder) => (context: PageContext) =>
        builder({
          ...context,
          reportLabel: REPORT_LABEL,
        })
      )
    );
    builders.push((context) =>
      buildAboutBestFitCityPage(relocation, {
        ...context,
        reportLabel: REPORT_LABEL,
      })
    );
  }

  const totalPages = builders.length;
  return builders.map((builder, index) =>
    builder({
      pageNumber: index + 1,
      totalPages,
      showGeneratedAt: index === 0,
      showHeaderMeta: index === 0,
    })
  );
}

function fallbackRelocationPayload(payload: CustomReportPayload): ReportPayload {
  const bestFit = payload.recommendations[0];
  return {
    generatedAt: payload.generatedAt,
    periodLabel: payload.periodLabel,
    baseCity: payload.baseCity ?? "—",
    primaryCity: bestFit?.city ?? "—",
    bestFitCity: bestFit?.city ?? "—",
    displayCurrency: payload.displayCurrency,
    householdSize: 1,
    incomeChangePct: 0,
    lifestyleLabel: "Average",
    lifestyleDescription: "",
    timeline: null,
    data: payload.data,
    affordability: null,
    readiness: {
      runwayMonths: null,
      runwayLabel: "",
      moveReadinessPct: 0,
      moveReadinessLabel: "",
      incomeCoveragePct: 0,
      incomeCoverageLabel: "",
    },
    savingsBalance: null,
    citySummaries: [],
    recommendations: payload.recommendations.map((entry) => ({
      city: entry.city,
      projectedBalance: entry.projectedBalance,
      verdictLabel: entry.verdictLabel,
    })),
    topRecommendations: payload.recommendations.slice(0, 3).map((entry) => ({
      city: entry.city,
      score: entry.score,
      projectedBalance: entry.projectedBalance,
      referenceMonthlyCost: entry.referenceMonthlyCost,
      verdictLabel: entry.verdictLabel,
    })),
    primaryResult: null,
    userBenchmarkSpending: {},
    formatDisplay: payload.formatExpense,
    formatExpense: payload.formatExpense,
    formatReferenceCost: payload.formatExpense,
    convertExpense: (amount) => amount,
    convertReferenceCost: (amount) => amount,
  };
}

export function buildCustomReportPageSections(
  types: CustomReportType[],
  payload: CustomReportPayload
): string[] {
  return buildReportPages(types, payload);
}

export function buildCustomReportsHtml(types: CustomReportType[], payload: CustomReportPayload) {
  const effectiveTypes = resolveExportTypes(types, payload);
  const pages = buildReportPages(types, payload);
  const title = `${REPORT_LABEL}: ${effectiveTypes.map((type) => CUSTOM_REPORT_LABELS[type]).join(", ")}`;
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
