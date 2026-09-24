import { BENCHMARK_CATEGORIES } from "@/lib/benchmark-categories";
import { getCityFlagCode } from "@/lib/city-flags";
import { benchmarkKeyFromComparisonLabel } from "@/lib/benchmark-categories";
import { MONTHLY_BENCHMARK_NOTE, rebuildCategoryGapsFromUserSpending } from "@/lib/city-data";
import { CITY_PROFILE_STAT_ROWS, getCityProfile } from "@/lib/city-profiles";
import {
  CompositeScoreEntry,
  HEALTH_SCORE_WEIGHT_ITEMS,
  HOME_ANALYZE_SCORE_NOTE_TITLE,
  HOME_FINANCIAL_HEALTH_COST_NOTE,
  PurchasingPowerIndexEntry,
  RELOCATION_FIT_CONTEXT_ITEMS,
  RELOCATION_FIT_SCORE_LABEL,
  RELOCATION_OVERVIEW_SUBTITLE,
  RELOCATION_SCORES_COMPARISON_NOTE,
  SCENARIO_ADJUSTED_HEALTH_SCORE_DATA_NOTE,
  SCENARIO_ADJUSTED_HEALTH_SCORE_LABEL,
  topPurchasingPowerExample,
} from "@/lib/relocation-composite";
import { formatHealthScore } from "@/lib/health-score";
import { REPORT_CHART_COLORS } from "@/lib/report-theme";
import { CityAffordabilitySummary } from "@/lib/relocation-scenario";
import { RelocationReadiness, RelocationTimeline } from "@/lib/relocation-profile";
import { RelocationAffordability, RELOCATION_AFFORDABILITY_FACTOR_NOTES, AT_HOME_BUDGET_SCORE_LABEL } from "@/lib/relocation-affordability";
import { AnalyzeResponse, LocationCompareResult, LocationComparison } from "@/lib/types";
import { comparisonGapPct, round2 } from "@/lib/utils";
import {
  buildFactorScorecardHtml,
  buildHorizontalGapBarChartSvg,
  buildKpiStripHtml,
  buildRelocationPageHeaderHtml,
  buildScoreStampHtml,
  computeRelocationOverviewScores,
  scoreBandLabel,
  scoreBandTone,
} from "@/lib/report-charts";
import {
  buildReportDocument,
  buildReportPageShell,
  downloadReportPdf,
  escapeHtml,
} from "@/lib/report-export";
import { getReportPrivacyNotice } from "@/lib/report-dates";
import { moveReadinessQualitativeLabel } from "@/lib/metric-tones";

export type ReportRecommendation = {
  city: string;
  score: number;
  projectedBalance: number;
  referenceMonthlyCost: number;
  verdictLabel: string;
};

export type ReportPayload = {
  generatedAt: string;
  periodLabel: string;
  baseCity: string;
  primaryCity: string;
  bestFitCity: string;
  displayCurrency: string;
  householdSize: number;
  incomeChangePct: number;
  lifestyleLabel: string;
  lifestyleDescription: string;
  timeline: RelocationTimeline | null;
  data: AnalyzeResponse;
  affordability: RelocationAffordability | null;
  readiness: RelocationReadiness;
  savingsBalance: number | null;
  citySummaries: CityAffordabilitySummary[];
  recommendations: { city: string; projectedBalance: number; verdictLabel: string }[];
  topRecommendations: ReportRecommendation[];
  primaryResult: LocationCompareResult | null;
  userBenchmarkSpending: Record<string, number>;
  rentIsEstimated?: boolean;
  formatDisplay: (amount: number) => string;
  formatExpense: (amount: number) => string;
  formatReferenceCost: (amount: number) => string;
  convertExpense: (amount: number) => number;
  convertReferenceCost: (amountUsd: number) => number;
  referenceCostNote?: string;
  dataSource?: string;
  dataSourceUpdated?: string;
  dataLicense?: string;
  homeMonthlyCostDisplay?: number | null;
  purchasingPowerEntries?: import("@/lib/relocation-composite").PurchasingPowerIndexEntry[];
  compositeEntries?: import("@/lib/relocation-composite").CompositeScoreEntry[];
  financialHealthScore?: number;
};

const REPORT_LABEL = "Relocation affordability";

export type RelocationPageContext = {
  pageNumber: number;
  totalPages: number;
  showGeneratedAt?: boolean;
  reportLabel?: string;
  /** Period / currency / lifestyle meta — first page of each report only. */
  showHeaderMeta?: boolean;
};

export function buildRelocationScoresComparisonNoteHtml() {
  return `<p class="report-explanatory-callout report-callout-compact relocation-scores-comparison-note">${escapeHtml(RELOCATION_SCORES_COMPARISON_NOTE)}</p>`;
}

function formatPct(value: number, signed = true) {
  const prefix = signed && value > 0 ? "+" : "";
  return `${prefix}${value.toFixed(1)}%`;
}

function timelineLabel(timeline: RelocationTimeline | null) {
  switch (timeline) {
    case "3months":
      return "Within 3 months";
    case "6months":
      return "Within 6 months";
    case "exploring":
      return "Just exploring";
    default:
      return "Not set";
  }
}

function relocationPageShell(
  context: RelocationPageContext,
  pageTitle: string,
  body: string,
  privacyNotice: string,
  payload: ReportPayload,
  options?: {
    showPrivacyBanner?: boolean;
    showOverviewSubtitle?: boolean;
    pageContentClass?: string;
    pageBreakBefore?: boolean;
    pageSubtitle?: string;
  }
) {
  const headerHtml = context.showHeaderMeta
    ? buildRelocationPageHeaderHtml(
        payload.periodLabel,
        payload.displayCurrency,
        payload,
        {
          privacyNotice,
          showPrivacyBanner: options?.showPrivacyBanner ?? false,
          overviewSubtitle: options?.showOverviewSubtitle ? RELOCATION_OVERVIEW_SUBTITLE : undefined,
        }
      )
    : "";

  const pageBody = options?.showOverviewSubtitle
    ? `<div class="relocation-overview-shell">${headerHtml}${body}</div>`
    : `${headerHtml}${body}`;

  return buildReportPageShell({
    pageNumber: context.pageNumber,
    totalPages: context.totalPages,
    reportLabel: context.reportLabel ?? REPORT_LABEL,
    pageTitle,
    pageSubtitle: options?.pageSubtitle,
    body: pageBody,
    privacyNotice,
    showPrivacy: false,
    pageBreakBefore: options?.pageBreakBefore,
    pageContentClass: [
      "page-content-relocation",
      options?.pageContentClass,
    ]
      .filter(Boolean)
      .join(" "),
    meta: {
      periodLabel: payload.periodLabel,
      displayCurrency: payload.displayCurrency,
    },
  });
}

function pageShell(
  pageNumber: number,
  pageTitle: string,
  body: string,
  privacyNotice: string,
  payload: ReportPayload,
  showPrivacyBanner = false
) {
  return relocationPageShell(
    { pageNumber, totalPages: 4, showGeneratedAt: showPrivacyBanner },
    pageTitle,
    body,
    privacyNotice,
    payload,
    { showPrivacyBanner, showOverviewSubtitle: showPrivacyBanner }
  );
}

function buildPurchasingPowerIndexReport(
  homeCity: string,
  entries: PurchasingPowerIndexEntry[],
  options?: { embedded?: boolean }
) {
  if (entries.length < 2) return "";

  const maxIndex = Math.max(...entries.map((entry) => entry.index), 100);
  const colors = [...REPORT_CHART_COLORS];
  const rows = entries
    .map((entry, index) => {
      const widthPct = Math.max(8, (entry.index / maxIndex) * 100);
      return `
      <div class="pp-index-row">
        <div class="pp-index-label">${entry.isHome ? "Home" : escapeHtml(entry.cityShort)}</div>
        <div class="pp-index-bar-track">
          <div class="pp-index-bar" style="width:${widthPct}%;background:${colors[index % colors.length]}"></div>
          ${entry.isHome ? `<span class="pp-index-baseline">home = 100</span>` : ""}
        </div>
        <div class="pp-index-value">${Math.round(entry.index)}</div>
      </div>`;
    })
    .join("");

  const example = topPurchasingPowerExample(entries, homeCity);

  const sectionClass = options?.embedded
    ? "report-section-bordered report-section-compact pp-index-section pp-index-section-embedded"
    : "report-section-bordered report-section-compact pp-index-section";

  const subtitle = options?.embedded
    ? "Same income vs. home cost of living (home = 100)"
    : "Same income, indexed against home cost of living (home = 100)";

  return `
    <div class="${sectionClass}">
      <p class="report-kicker">Purchasing power index</p>
      <h2 class="section-title pp-index-section-title">${escapeHtml(subtitle)}</h2>
      <div class="pp-index-chart pp-index-chart-compact pp-index-chart-embedded">${rows}</div>
      ${example ? `<p class="report-explanatory-callout report-callout-compact pp-index-example-embedded">${escapeHtml(example)}</p>` : ""}
    </div>`;
}

function dedupeCompositeEntries(entries: CompositeScoreEntry[]) {
  let homeSeen = false;
  return entries.filter((entry) => {
    if (entry.isHome) {
      if (homeSeen) return false;
      homeSeen = true;
      return true;
    }
    return !entries.some((home) => home.isHome && home.city === entry.city);
  });
}

function formatWeightPct(weight: number) {
  return `${Math.round(weight * 100)}%`;
}

function formatRelocationContextHtml(entry: CompositeScoreEntry) {
  const costLabel =
    entry.costVsHomePct > 0
      ? `−${entry.costVsHomePct.toFixed(0)}% cost vs. home`
      : entry.costVsHomePct < 0
        ? `+${Math.abs(entry.costVsHomePct).toFixed(0)}% cost vs. home`
        : "0% cost vs. home";
  const runwayLabel =
    entry.savingsRunwayMonths !== null
      ? `${entry.savingsRunwayMonths.toFixed(1)} mo savings runway`
      : "Savings runway n/a";
  return `${costLabel} · ${Math.round(entry.purchasingPowerIndex)} purchasing power · ${runwayLabel}`;
}

function buildCompositeWeightsHtml() {
  const renderWeightList = (items: readonly { label: string; weight: number }[]) =>
    items
      .map(
        (item) =>
          `<li><span>${escapeHtml(item.label)}</span><strong>${formatWeightPct(item.weight)}</strong></li>`
      )
      .join("");

  const renderContextList = () =>
    RELOCATION_FIT_CONTEXT_ITEMS.map(
      (item) =>
        `<li><span class="composite-context-label-report">${escapeHtml(item.label)}</span><span class="composite-context-desc-report">${escapeHtml(item.description)}</span></li>`
    ).join("");

  return `
    <div class="composite-weights-panel-report">
      <div class="composite-weights-block-report">
        <h3 class="composite-weights-title-report">${escapeHtml(SCENARIO_ADJUSTED_HEALTH_SCORE_LABEL)} weights</h3>
        <p class="composite-weights-note-report">Applies to the donut gauges above — not the ${escapeHtml(RELOCATION_FIT_SCORE_LABEL.toLowerCase())} on city cards.</p>
        <p class="composite-weights-note-report">${escapeHtml(SCENARIO_ADJUSTED_HEALTH_SCORE_DATA_NOTE)}</p>
        <ul class="composite-weights-list-report">${renderWeightList(HEALTH_SCORE_WEIGHT_ITEMS)}</ul>
      </div>
      <div class="composite-weights-block-report">
        <h3 class="composite-weights-title-report">${escapeHtml(RELOCATION_FIT_SCORE_LABEL)} factors</h3>
        <p class="composite-weights-note-report">City cards use these destination comparisons (shown under each card) to explain relocation fit alongside the score.</p>
        <ul class="composite-weights-list-report composite-context-list-report">${renderContextList()}</ul>
      </div>
    </div>`;
}

function buildCompositeScoresReport(entries: CompositeScoreEntry[]) {
  const displayEntries = dedupeCompositeEntries(entries);
  const destinations = displayEntries.filter((entry) => !entry.isHome);
  if (!destinations.length) return "";

  const gaugeColors = [...REPORT_CHART_COLORS];
  const destinationScores = destinations.map((entry) => entry.financialHealthScore);
  const scoresSaturated =
    destinationScores.length > 1 &&
    destinationScores.every((score) => score >= 85) &&
    new Set(destinationScores.map((score) => score.toFixed(1))).size === 1;
  const gauges = displayEntries
    .map((entry, index) => {
      const score = Math.max(0, Math.min(100, entry.financialHealthScore));
      const band = scoreBandLabel(score, "health");
      const radius = 28;
      const circumference = 2 * Math.PI * radius;
      const offset = circumference - (score / 100) * circumference;
      const label = entry.isHome
        ? `Home — ${escapeHtml(entry.cityShort)}`
        : escapeHtml(entry.cityShort);
      const homeCostNote = entry.isHome
        ? `<span class="composite-gauge-note-title">${escapeHtml(HOME_ANALYZE_SCORE_NOTE_TITLE)}</span><span class="composite-gauge-note">${escapeHtml(HOME_FINANCIAL_HEALTH_COST_NOTE)}</span>`
        : "";
      return `
      <div class="composite-gauge-report composite-gauge-report-compact${entry.isHome ? " composite-gauge-report-home" : ""}">
        <svg width="72" height="72" viewBox="0 0 88 88" aria-hidden="true">
          <circle cx="44" cy="44" r="${radius}" fill="none" stroke="#eef4f6" stroke-width="8"></circle>
          <circle cx="44" cy="44" r="${radius}" fill="none" stroke="${gaugeColors[index % gaugeColors.length]}" stroke-width="8" stroke-dasharray="${circumference}" stroke-dashoffset="${offset}" transform="rotate(-90 44 44)"></circle>
          <text x="44" y="47" text-anchor="middle" class="composite-gauge-value">${score.toFixed(1)}</text>
        </svg>
        <span class="composite-gauge-band">${band}</span>
        <span>${label}</span>
        <span class="composite-gauge-type">${escapeHtml(SCENARIO_ADJUSTED_HEALTH_SCORE_LABEL)}</span>
        ${homeCostNote}
      </div>`;
    })
    .join("");

  const cards = destinations
    .map((entry) => {
      return `
      <div class="composite-city-card-report${entry.isBestFit ? " best-fit" : ""}">
        <div class="composite-city-card-head">
          <strong>${escapeHtml(entry.city)}</strong>
          ${entry.isBestFit ? `<span class="composite-best-fit">Best fit</span>` : ""}
        </div>
        <div class="composite-city-score">${formatHealthScore(entry.relocationLikelihoodScore)}</div>
        <span class="composite-gauge-band">${escapeHtml(scoreBandLabel(entry.relocationLikelihoodScore, "relocation"))}</span>
        <p class="composite-score-type">${escapeHtml(RELOCATION_FIT_SCORE_LABEL)}</p>
        <p class="composite-city-component-scores-report">${escapeHtml(formatRelocationContextHtml(entry))}</p>
      </div>`;
    })
    .join("");

  const bestReason = destinations.find((entry) => entry.rankReason)?.rankReason;

  return `
    <div class="report-section-bordered report-section-compact composite-scores-report">
      <p class="report-kicker">Financial health &amp; relocation fit</p>
      <h2 class="section-title">Composite scores — illustrative weighting, not a guarantee</h2>
      ${buildCompositeWeightsHtml()}
      <p class="report-explanatory-callout report-callout-compact">Gauges use the health score weights above. City cards show ${escapeHtml(RELOCATION_FIT_SCORE_LABEL.toLowerCase())} with cost vs. home, purchasing power, and savings runway. Tier bands: Excellent 85+, Good 65+, Reasonable 50+.${scoresSaturated ? " Scores may cluster when projected margins are very similar — use cost context below to compare." : ""}</p>
      <div class="composite-gauge-grid-report composite-gauge-grid-compact">${gauges}</div>
      <div class="composite-card-grid-report composite-card-grid-compact">${cards}</div>
      ${bestReason ? `<p class="report-explanatory-callout report-callout-compact">${escapeHtml(bestReason)}</p>` : ""}
    </div>`;
}

function adjustmentChart(
  income: number,
  cost: number,
  balance: number,
  destCity: string,
  formatDisplay: (amount: number) => string,
  options?: {
    expenseBasis?: "projected" | "actual";
    embedded?: boolean;
  }
) {
  const expenseBasis = options?.expenseBasis ?? "projected";
  const max = Math.max(income, cost, Math.abs(balance), 1);
  const incomeW = Math.round((income / max) * 100);
  const costW = Math.round((cost / max) * 100);
  const balanceW = Math.round((Math.abs(balance) / max) * 100);
  const costLabel =
    expenseBasis === "actual"
      ? `Your category spending in ${escapeHtml(destCity)}`
      : `Est. cost in ${escapeHtml(destCity)}`;
  const balanceLabel =
    expenseBasis === "actual" ? "Adjusted monthly balance" : "Projected monthly balance";
  const costLegend =
    expenseBasis === "actual" ? "Destination-adjusted expenses" : "Destination cost";
  const balanceLegend = expenseBasis === "actual" ? "Adjusted balance" : "Projected balance";
  const basisKicker = `<p class="report-kicker relocation-adj-kicker">${escapeHtml(
    expenseBasis === "actual" ? AT_HOME_BUDGET_SCORE_LABEL : RELOCATION_FIT_SCORE_LABEL
  )}</p>`;
  const panelClass = [
    "report-section-bordered relocation-adj-panel",
    options?.embedded ? "relocation-adj-panel-embedded" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return `
    <div class="${panelClass}">
    <h2 class="section-title">Affordability adjustment</h2>
    ${basisKicker}
    <div class="adjustment-chart relocation-adj-chart">
      <div class="adj-row">
        <div class="adj-label">Scenario monthly income (after exchange & what-if)</div>
        <div class="adj-bar-wrap">
          <div class="adj-bar income" style="width:${incomeW}%"></div>
        </div>
        <div class="adj-value">${formatDisplay(income)}</div>
      </div>
      <div class="adj-row">
        <div class="adj-label">${costLabel}</div>
        <div class="adj-bar-wrap">
          <div class="adj-bar cost" style="width:${costW}%"></div>
        </div>
        <div class="adj-value">${formatDisplay(cost)}</div>
      </div>
      <div class="adj-row">
        <div class="adj-label">${balanceLabel}</div>
        <div class="adj-bar-wrap">
          <div class="adj-bar ${balance >= 0 ? "balance-pos" : "balance-neg"}" style="width:${balanceW}%"></div>
        </div>
        <div class="adj-value ${balance >= 0 ? "pos" : "neg"}">${balance >= 0 ? "+" : ""}${formatDisplay(balance)}</div>
      </div>
    </div>
    <div class="legend">
      <span><i class="swatch income"></i> Scenario income</span>
      <span><i class="swatch cost"></i> ${costLegend}</span>
      <span><i class="swatch ${balance >= 0 ? "balance-pos" : "balance-neg"}"></i> ${balanceLegend}</span>
    </div>
    </div>`;
}

function formatCompositeFitContext(entry: CompositeScoreEntry) {
  const costLabel =
    entry.costVsHomePct > 0
      ? `${entry.costVsHomePct.toFixed(0)}% lower cost vs. typical spending`
      : entry.costVsHomePct < 0
        ? `${Math.abs(entry.costVsHomePct).toFixed(0)}% higher cost vs. typical spending`
        : "Same cost vs. typical spending";
  const runwayLabel =
    entry.savingsRunwayMonths !== null
      ? `${entry.savingsRunwayMonths.toFixed(1)} mo savings runway`
      : "Savings runway n/a";
  return `${costLabel} · ${Math.round(entry.purchasingPowerIndex)} purchasing power · ${runwayLabel}`;
}

function buildRelocationOverviewBodies(payload: ReportPayload) {
  const dest = payload.bestFitCity;
  const aff = payload.affordability;
  const destLabel = dest.split(",")[0]?.trim() ?? dest;
  const bestFitComposite = payload.compositeEntries?.find(
    (entry) =>
      !entry.isHome && entry.city.trim().toLowerCase() === dest.trim().toLowerCase()
  );
  const budgetFactorScores = aff ? computeRelocationOverviewScores(aff) : null;
  const displayScore =
    bestFitComposite?.relocationLikelihoodScore ?? aff?.score ?? budgetFactorScores?.heroScore ?? 0;
  const tone = scoreBandTone(displayScore);
  const heroSummary =
    aff?.summary ??
    (bestFitComposite
      ? `${RELOCATION_FIT_SCORE_LABEL} for ${dest} is ${formatHealthScore(displayScore)} — see city card on the next page for the same value.`
      : "");

  const fitFactorCards = bestFitComposite
    ? `
          ${buildFactorScorecardHtml("Savings rate", bestFitComposite.savingsRateScore, undefined, "Scenario income minus projected destination living costs, as a share of income.")}
          ${buildFactorScorecardHtml("Income stability", bestFitComposite.incomeStabilityScore, undefined, "Income volatility from your uploaded statement periods.")}
          ${buildFactorScorecardHtml("Non-essential control", bestFitComposite.nonEssentialScore, undefined, "Discretionary spending relative to scenario income at the destination.")}`
    : budgetFactorScores
      ? `
          ${buildFactorScorecardHtml("Savings rate", budgetFactorScores.savingsRateScore, undefined, RELOCATION_AFFORDABILITY_FACTOR_NOTES.savingsRate)}
          ${buildFactorScorecardHtml("Income stability", budgetFactorScores.incomeStabilityScore, undefined, RELOCATION_AFFORDABILITY_FACTOR_NOTES.incomeStability)}
          ${buildFactorScorecardHtml("Non-essential control", budgetFactorScores.nonEssentialScore, undefined, RELOCATION_AFFORDABILITY_FACTOR_NOTES.nonEssentialControl)}`
      : "";

  const budgetMarginBlock =
    aff && budgetFactorScores
      ? `
      <div class="score-hero score-hero-${scoreBandTone(aff.score)} relocation-budget-margin-hero">
        <div class="score-hero-main">
          ${buildScoreStampHtml(aff.score, "relocation")}
          <div class="score-hero-name">${escapeHtml(AT_HOME_BUDGET_SCORE_LABEL)}</div>
          <p class="score-hero-summary">${escapeHtml(aff.scoreSummary)}</p>
        </div>
        <div class="score-hero-factors">
          ${buildFactorScorecardHtml("Savings rate", budgetFactorScores.savingsRateScore, undefined, RELOCATION_AFFORDABILITY_FACTOR_NOTES.savingsRate)}
          ${buildFactorScorecardHtml("Income stability", budgetFactorScores.incomeStabilityScore, undefined, RELOCATION_AFFORDABILITY_FACTOR_NOTES.incomeStability)}
          ${buildFactorScorecardHtml("Non-essential control", budgetFactorScores.nonEssentialScore, undefined, RELOCATION_AFFORDABILITY_FACTOR_NOTES.nonEssentialControl)}
        </div>
      </div>`
      : "";

  return {
    destLabel,
    aff,
    overviewBody: `
    <div class="relocation-overview-page">
    <div class="hero-zone relocation-overview-hero">
      <div class="score-hero score-hero-${tone}">
        <div class="score-hero-main">
          ${buildScoreStampHtml(displayScore, "relocation")}
          <div class="score-hero-name">${escapeHtml(RELOCATION_FIT_SCORE_LABEL)} — ${escapeHtml(dest)}</div>
          ${heroSummary ? `<p class="score-hero-summary">${escapeHtml(heroSummary)}</p>` : ""}
          ${bestFitComposite ? `<p class="score-hero-summary relocation-fit-context-line">${escapeHtml(formatCompositeFitContext(bestFitComposite))}</p>` : ""}
        </div>
        <div class="score-hero-factors">
          ${fitFactorCards}
        </div>
      </div>
      ${budgetMarginBlock}
    </div>
    ${buildKpiStripHtml(
      [
        { label: "Current city", value: escapeHtml(payload.baseCity) },
        { label: "Best-fit city", value: escapeHtml(dest), tone: "good" },
        {
          label: "Projected balance",
          value: aff
            ? `${aff.projectedBalance >= 0 ? "+" : ""}${payload.formatDisplay(aff.projectedBalance)}`
            : "—",
          tone: aff && aff.projectedBalance >= 0 ? "good" : "mid",
        },
      ],
      { className: "kpi-strip-relocation-overview" }
    )}
    </div>`,
    adjustmentBody:
      aff
        ? `<div class="relocation-overview-page relocation-adjustment-page">
    <div class="relocation-overview-adj-section">${adjustmentChart(
      aff.scenarioIncomeDisplay,
      aff.displayReferenceCost,
      aff.projectedBalance,
      destLabel,
      payload.formatDisplay,
      { expenseBasis: "projected" }
    )}</div>
    <div class="relocation-overview-adj-section">${adjustmentChart(
      aff.scenarioIncomeDisplay,
      aff.displayCategoryAdjustedExpenses,
      aff.adjustedScenarioSurplus,
      destLabel,
      payload.formatDisplay,
      { expenseBasis: "actual" }
    )}</div>
    </div>`
        : "",
  };
}

export function buildRelocationOverviewPageBuilders(
  payload: ReportPayload
): ((context: RelocationPageContext) => string)[] {
  const privacyNotice = getReportPrivacyNotice(payload.data.privacy_notice);
  const { overviewBody, adjustmentBody } = buildRelocationOverviewBodies(payload);

  const builders: ((context: RelocationPageContext) => string)[] = [
    (context) =>
      relocationPageShell(
        context,
        "Relocation overview",
        overviewBody,
        privacyNotice,
        payload,
        {
          showPrivacyBanner: context.showGeneratedAt ?? false,
          showOverviewSubtitle: true,
          pageContentClass: "page-content-relocation-overview",
        }
      ),
  ];

  if (adjustmentBody) {
    builders.push((context) =>
      relocationPageShell(
        context,
        "Affordability adjustment",
        adjustmentBody,
        privacyNotice,
        payload,
        {
          pageContentClass: "page-content-relocation-overview page-content-relocation-adjustment",
          pageBreakBefore: true,
        }
      )
    );
  }

  return builders;
}

export function buildRelocationOverviewPage(
  payload: ReportPayload,
  context: RelocationPageContext
) {
  return buildRelocationOverviewPageBuilders(payload)[0](context);
}

function buildPageTwo(payload: ReportPayload, context: RelocationPageContext) {
  return buildFinancialHealthRelocationFitPage(payload, context);
}

function buildPageFour(payload: ReportPayload, context: RelocationPageContext) {
  return buildAboutBestFitCityPage(payload, context);
}

function relocationReportPageBuilders(payload: ReportPayload) {
  const builders: Array<(context: RelocationPageContext) => string> = [
    ...buildRelocationOverviewPageBuilders(payload).map((builder, index) => (context: RelocationPageContext) =>
      builder({
        ...context,
        showGeneratedAt: index === 0,
      })
    ),
    (context) => buildPageTwo(payload, context),
  ];

  builders.push(
    ...buildSpendingVsBestFitPageBuilders(payload).map((builder) => (context: RelocationPageContext) =>
      builder(context)
    ),
    (context) => buildPageFour(payload, context)
  );

  return builders;
}

export function buildFinancialHealthRelocationFitPage(
  payload: ReportPayload,
  context: RelocationPageContext
) {
  const composite =
    payload.compositeEntries?.length
      ? buildCompositeScoresReport(payload.compositeEntries)
      : `<p class="muted-note">Run a city comparison in the app to populate composite scores.</p>`;

  const purchasingPowerEntries = payload.purchasingPowerEntries ?? [];
  const purchasingPower =
    purchasingPowerEntries.length >= 2
      ? buildPurchasingPowerIndexReport(payload.baseCity, purchasingPowerEntries, {
          embedded: true,
        })
      : "";

  const body = purchasingPower
    ? `<div class="relocation-fit-composite-page">${composite}${purchasingPower}</div>`
    : composite;

  return relocationPageShell(
    context,
    "Financial health & relocation fit",
    body,
    getReportPrivacyNotice(payload.data.privacy_notice),
    payload,
    {
      pageContentClass: purchasingPower
        ? "page-content-relocation-fit-composite"
        : undefined,
    }
  );
}

export function buildPurchasingPowerIndexPage(
  payload: ReportPayload,
  context: RelocationPageContext
) {
  const purchasingPower =
    payload.purchasingPowerEntries?.length
      ? buildPurchasingPowerIndexReport(payload.baseCity, payload.purchasingPowerEntries)
      : "";

  if (!purchasingPower) return "";

  return relocationPageShell(
    context,
    "Purchasing power index",
    purchasingPower,
    getReportPrivacyNotice(payload.data.privacy_notice),
    payload
  );
}

export function buildSpendingVsBestFitPageBuilders(
  payload: ReportPayload
): ((context: RelocationPageContext) => string)[] {
  const privacyNotice = getReportPrivacyNotice(payload.data.privacy_notice);
  const metricsBody = buildRelocationMetricsStrip(payload);
  const storyBody = buildRelocationStory(payload);

  return [
    (context) =>
      relocationPageShell(
        context,
        "Spending vs best-fit city",
        `${metricsBody}${storyBody}`,
        privacyNotice,
        payload,
        { pageContentClass: "page-content-spending-vs-city" }
      ),
  ];
}

export function buildSpendingVsBestFitPage(
  payload: ReportPayload,
  context: RelocationPageContext
) {
  return buildSpendingVsBestFitPageBuilders(payload)[0](context);
}

export function buildAboutBestFitCityPage(
  payload: ReportPayload,
  context: RelocationPageContext
) {
  const body = `${buildCityProfileTable(payload.bestFitCity, payload)}${buildLargestCategoryGaps(payload)}`;

  return relocationPageShell(
    context,
    "About your best-fit city",
    body,
    getReportPrivacyNotice(payload.data.privacy_notice),
    payload
  );
}

function cityShortName(city: string) {
  return city.split(",")[0]?.trim() ?? city;
}

function userSpendingTotal(spending: Record<string, number>) {
  return BENCHMARK_CATEGORIES.reduce((sum, category) => sum + (spending[category.key] ?? 0), 0);
}

function resolveRelocationCostTotals(payload: ReportPayload) {
  const userTotalRaw = userSpendingTotal(payload.userBenchmarkSpending);
  const userTotalDisplay = round2(payload.convertExpense(userTotalRaw));
  const destTotalDisplay = round2(
    payload.affordability?.displayReferenceCost ??
      payload.convertReferenceCost(payload.primaryResult?.reference_monthly_total ?? 0)
  );
  const spendingGap = round2(userTotalDisplay - destTotalDisplay);
  return { userTotalRaw, userTotalDisplay, destTotalDisplay, spendingGap };
}

function buildRelocationMetricsStrip(payload: ReportPayload) {
  const aff = payload.affordability;
  const { userTotalRaw, userTotalDisplay, destTotalDisplay, spendingGap } =
    resolveRelocationCostTotals(payload);

  return buildKpiStripHtml(
    [
    {
      index: 1,
      label: "Scenario income",
      value: aff ? payload.formatDisplay(aff.scenarioIncomeDisplay) : "—",
      tone: "good",
    },
    {
      index: 2,
      label: "Destination cost",
      value: payload.formatDisplay(destTotalDisplay),
    },
    {
      index: 3,
      label: "Your spending total",
      value: payload.formatExpense(userTotalRaw),
    },
    {
      index: 4,
      label: "Monthly budget headroom",
      value: `${spendingGap >= 0 ? "+" : ""}${payload.formatDisplay(spendingGap)}`,
      tone: spendingGap > 0 ? "good" : spendingGap < 0 ? "mid" : "neutral",
      formula: "3 − 2 = 4",
    },
    {
      index: 5,
      label: "Projected balance",
      value: aff
        ? `${aff.projectedBalance >= 0 ? "+" : ""}${payload.formatDisplay(aff.projectedBalance)}`
        : "—",
      tone: aff && aff.projectedBalance >= 0 ? "good" : "mid",
      formula: "1 − 2 = 5",
    },
    {
      index: 6,
      label: "Savings runway",
      value:
        payload.readiness.runwayMonths !== null
          ? `${payload.readiness.runwayMonths.toFixed(1)} mo`
          : "—",
      formula:
        payload.readiness.runwayMonths !== null && payload.savingsBalance
          ? "Savings balance ÷ 2 = 6"
          : undefined,
    },
  ],
    { className: "kpi-strip-relocation-spending", compact: true }
  );
}

function cityFlagImg(city: string) {
  const code = getCityFlagCode(city);
  if (!code) return "";
  return `<img class="city-profile-flag" src="https://flagcdn.com/w80/${code}.png" alt="" width="40" height="30" />`;
}

function filterReportableCategoryGaps(
  comparisons: LocationComparison[],
  userBenchmarkSpending: Record<string, number>
) {
  const hasRentInRecords = (userBenchmarkSpending.rent ?? 0) > 0;
  return comparisons.filter((row) => {
    if (row.reference_amount <= 0) return false;
    if (row.difference_pct === null || row.user_amount <= 0) return false;
    const key = benchmarkKeyFromComparisonLabel(row.category);
    if (key === "rent" && !hasRentInRecords) return false;
    return true;
  });
}

function rentGapOmissionNote(payload: ReportPayload) {
  const hasRentInRecords =
    (payload.userBenchmarkSpending.rent ?? 0) > 0 && !payload.rentIsEstimated;
  const hasMortgageInRecords = (payload.userBenchmarkSpending.mortgage ?? 0) > 0;
  if (!hasRentInRecords && hasMortgageInRecords) {
    return `<p class="report-explanatory-callout report-callout-compact">Your housing cost is tracked as <strong>mortgage payment</strong> (${payload.formatExpense(payload.userBenchmarkSpending.mortgage ?? 0)}), not rent — rent benchmark gaps are omitted because they would compare against an estimated market rent, not your actual mortgage.</p>`;
  }
  if (payload.rentIsEstimated) {
    return `<p class="muted-note">No rent expense appears in your uploaded records — the rent gap uses an estimated equivalent for ${escapeHtml(cityShortName(payload.baseCity))} (${payload.formatExpense(payload.userBenchmarkSpending.rent ?? 0)}), matching the category matrix.</p>`;
  }
  if (!hasRentInRecords) {
    return `<p class="muted-note">Rent benchmark gaps are omitted when you have no rent transactions in the comparison matrix.</p>`;
  }
  return "";
}

function resolveReportCategoryGaps(payload: ReportPayload): LocationComparison[] {
  const comparisons = payload.primaryResult?.comparisons ?? [];
  if (!comparisons.length) return [];
  return rebuildCategoryGapsFromUserSpending(
    comparisons,
    payload.userBenchmarkSpending
  ).map((row) => {
    const userAmount = round2(payload.convertExpense(row.user_amount));
    const referenceAmount = round2(payload.convertReferenceCost(row.reference_amount));
    const difference = round2(userAmount - referenceAmount);
    return {
      ...row,
      user_amount: userAmount,
      reference_amount: referenceAmount,
      difference,
      difference_pct: comparisonGapPct(userAmount, referenceAmount),
    };
  });
}

function buildRelocationStoryGroup(title: string, bullets: string[]) {
  if (!bullets.length) return "";
  return `
    <div class="relocation-story-group">
      <h3 class="relocation-story-group-title">${escapeHtml(title)}</h3>
      <ul class="relocation-story-list">
        ${bullets.map((bullet) => `<li>${bullet}</li>`).join("")}
      </ul>
    </div>`;
}

function buildRelocationStory(payload: ReportPayload) {
  const aff = payload.affordability;
  const result = payload.primaryResult;
  const destCity = payload.bestFitCity;
  const destShort = cityShortName(destCity);
  const homeShort = cityShortName(payload.baseCity);
  const { userTotalRaw, destTotalDisplay, spendingGap: spendingDelta } =
    resolveRelocationCostTotals(payload);
  const filteredGaps = filterReportableCategoryGaps(
    resolveReportCategoryGaps(payload),
    payload.userBenchmarkSpending
  );
  const topByDollar = [...filteredGaps]
    .filter((row) => row.difference > 0)
    .sort((a, b) => b.difference - a.difference)[0];

  const spendingSnapshot = [
    `For <strong>${escapeHtml(payload.periodLabel)}</strong>, your tracked monthly spending totals <strong>${payload.formatExpense(userTotalRaw)}</strong> across rent, groceries, transport, and the other benchmark categories.`,
    `<strong>This total does not include mortgage payment</strong> or expenses outside the relocation comparison matrix.`,
    `<strong>${escapeHtml(destCity)}</strong> ranks #1 with an estimated monthly living cost of <strong>${payload.formatDisplay(destTotalDisplay)}/mo</strong> for a ${payload.householdSize}-person ${escapeHtml(payload.lifestyleLabel.toLowerCase())} lifestyle — built from live city price data (WhereNext). ${escapeHtml(payload.referenceCostNote ?? MONTHLY_BENCHMARK_NOTE)}`,
  ];

  const budgetRoom: string[] = [];
  if (spendingDelta > 0) {
    budgetRoom.push(
      `Reference costs in ${escapeHtml(destShort)} suggest roughly <strong>${payload.formatDisplay(spendingDelta)}</strong> more room in your monthly budget versus your current spending pattern — before factoring in income changes.`
    );
  } else if (spendingDelta < 0) {
    budgetRoom.push(
      `Reference costs in ${escapeHtml(destShort)} run about <strong>${payload.formatDisplay(Math.abs(spendingDelta))}</strong> higher than your current category spending, so lifestyle adjustments may be needed.`
    );
  }

  const affordability: string[] = [];
  if (aff) {
    affordability.push(
      `With scenario income of <strong>${payload.formatDisplay(aff.scenarioIncomeDisplay)}</strong>, you would project a <strong class="${aff.projectedBalance >= 0 ? "pos" : "neg"}">${aff.projectedBalance >= 0 ? "+" : ""}${payload.formatDisplay(aff.projectedBalance)}</strong> monthly balance (${escapeHtml(aff.verdictLabel)}).`
    );
  }

  const categoryOpportunity: string[] = [];
  if (topByDollar) {
    categoryOpportunity.push(
      `The largest gap by dollar amount is <strong>${escapeHtml(topByDollar.category)}</strong> — your spending in ${escapeHtml(homeShort)} is <strong>${payload.formatExpense(topByDollar.difference)}</strong> above the ${escapeHtml(destShort)} reference. See the chart below for the largest gaps ranked by percentage.`
    );
  }

  const readiness: string[] = [];
  if (payload.readiness.runwayMonths !== null) {
    readiness.push(
      `<strong>Savings runway:</strong> About <strong>${payload.readiness.runwayMonths.toFixed(1)} months</strong> — how long current savings would last with zero income at your current monthly expenses.`
    );
    readiness.push(
      `<strong>Move-readiness score:</strong> <strong>${payload.readiness.moveReadinessPct.toFixed(0)}%</strong> (${moveReadinessQualitativeLabel(payload.readiness.moveReadinessPct).toLowerCase()}) — your monthly surplus expressed as a share of destination costs (higher means more room to absorb a cost increase). ${escapeHtml(payload.readiness.moveReadinessLabel)}`
    );
    if (payload.timeline) {
      readiness.push(`You selected a timeline of <strong>${escapeHtml(timelineLabel(payload.timeline))}</strong>.`);
    }
  }

  return `
    <div class="relocation-story-box relocation-story-box-large">
      <h2 class="section-title">What this means for your move</h2>
      ${buildRelocationStoryGroup("Spending snapshot", spendingSnapshot)}
      ${buildRelocationStoryGroup("Budget room vs. destination", budgetRoom)}
      ${buildRelocationStoryGroup("Scenario affordability", affordability)}
      ${buildRelocationStoryGroup("Category opportunity (largest $ gap)", categoryOpportunity)}
      ${buildRelocationStoryGroup("Readiness & timeline", readiness)}
    </div>`;
}

function buildCityProfileCard(city: string, heading: string) {
  const profile = getCityProfile(city);

  const rows = CITY_PROFILE_STAT_ROWS.map(
    (row, index) => `
    <tr class="${index % 2 === 0 ? "stripe" : ""}">
      <th scope="row">${escapeHtml(row.label)}</th>
      <td>${escapeHtml(profile[row.key] ?? "—")}</td>
    </tr>`
  ).join("");

  return `
    <div class="report-section-bordered chart-panel city-profile-card">
      <div class="city-profile-header">
        <h2 class="section-title">${escapeHtml(heading)}</h2>
        ${cityFlagImg(city)}
      </div>
      <p class="muted-note">Indicative city profile for relocation planning — verify locally before deciding.</p>
      <table class="city-profile-table report-table-styled">
        <tbody>${rows}</tbody>
      </table>
      ${profile.notes ? `<p class="muted-note">${escapeHtml(profile.notes)}</p>` : ""}
    </div>`;
}

function buildCityProfileTable(city: string, payload: ReportPayload) {
  const homeShort = cityShortName(payload.baseCity);
  const destShort = cityShortName(city);

  return `
    <div class="city-profile-compare">
      ${buildCityProfileCard(payload.baseCity, `About ${homeShort} (your current city)`)}
      ${buildCityProfileCard(city, `About ${destShort} (best fit)`)}
    </div>
    <div class="report-sources-box">
      <h3 class="report-sources-title">Sources for city &amp; country statistics</h3>
      <ul class="report-sources-list">
        ${
          payload.dataSource
            ? `<li><strong>Living cost data:</strong> ${escapeHtml(payload.dataSource)}${payload.dataSourceUpdated ? ` (updated ${escapeHtml(payload.dataSourceUpdated)})` : ""}${payload.dataLicense ? ` — ${escapeHtml(payload.dataLicense)}` : ""}</li>`
            : `<li><strong>Living cost data:</strong> WhereNext City Price Dataset (live API)</li>`
        }
        <li><strong>Benchmark method:</strong> ${escapeHtml(MONTHLY_BENCHMARK_NOTE)}</li>
        <li><strong>City profile facts:</strong> Indicative summaries for planning — confirm with official local sources before relocating.</li>
      </ul>
    </div>`;
}

function buildLargestCategoryGaps(payload: ReportPayload) {
  const homeShort = cityShortName(payload.baseCity);
  const destShort = cityShortName(payload.bestFitCity);
  if (!payload.primaryResult) {
    return `<p class="muted-note">Run a city comparison in the app to populate category gaps.</p>`;
  }

  const filtered = filterReportableCategoryGaps(
    resolveReportCategoryGaps(payload),
    payload.userBenchmarkSpending
  );
  const rentOmissionNote = rentGapOmissionNote(payload);

  if (!filtered.length) {
    return `${rentOmissionNote}<p class="muted-note">No category gaps with uploaded spending data for this comparison.</p>`;
  }

  return `
    <div class="chart-panel report-section-bordered gap-chart-compact">
      <h2 class="section-title">Largest category gaps by % — ${escapeHtml(homeShort)} vs ${escapeHtml(destShort)}</h2>
      <p class="muted-note">Each bar compares your uploaded spending in a category to the estimated monthly cost in ${escapeHtml(destShort)} (same categories as the web app matrix). Both amounts are converted to ${escapeHtml(payload.displayCurrency)} before the gap is calculated: (your spending − destination estimate) ÷ destination estimate. Categories with no uploaded spending are omitted. Ranked by absolute % gap.</p>
      ${rentOmissionNote}
      ${buildHorizontalGapBarChartSvg(
        [...filtered]
          .sort((a, b) => Math.abs(b.difference_pct ?? 0) - Math.abs(a.difference_pct ?? 0))
          .map((row) => ({
            label: row.category,
            value: row.difference_pct ?? 0,
          })),
        (value) => `${value > 0 ? "+" : ""}${value.toFixed(1)}%`,
        { barHeight: 14, trackWidth: 240, labelWidth: 132 }
      )}
    </div>`;
}

export function buildRelocationReportHtml(payload: ReportPayload) {
  const body = buildRelocationReportPageSections(payload).join("");
  return buildReportDocument(`${REPORT_LABEL} Report`, body);
}

export function buildRelocationReportPageSections(payload: ReportPayload): string[] {
  const builders = relocationReportPageBuilders(payload);
  const totalPages = builders.length;
  return builders
    .map((builder, index) =>
      builder({
        pageNumber: index + 1,
        totalPages,
        showGeneratedAt: index === 0,
        showHeaderMeta: index === 0,
      })
    )
    .filter(Boolean);
}

function reportFilename(payload: ReportPayload) {
  const stamp = new Date().toISOString().slice(0, 10);
  const dest = payload.baseCity.split(",")[0]?.trim().replace(/\s+/g, "-").toLowerCase() ?? "report";
  return `relocation-report-${dest}-${stamp}.pdf`;
}

export async function exportRelocationReport(payload: ReportPayload) {
  const html = buildRelocationReportHtml(payload);
  await downloadReportPdf(html, reportFilename(payload));
}

export async function downloadRelocationReport(payload: ReportPayload) {
  await exportRelocationReport(payload);
}
