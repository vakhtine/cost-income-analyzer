import { BENCHMARK_CATEGORIES } from "@/lib/benchmark-categories";
import { MONTHLY_BENCHMARK_NOTE } from "@/lib/city-data";
import { CITY_PROFILE_STAT_ROWS, getCityProfile } from "@/lib/city-profiles";
import {
  CompositeScoreEntry,
  PurchasingPowerIndexEntry,
  RELOCATION_COMPOSITE_FOOTNOTE,
  topPurchasingPowerExample,
} from "@/lib/relocation-composite";
import { CityAffordabilitySummary } from "@/lib/relocation-scenario";
import { RelocationReadiness, RelocationTimeline } from "@/lib/relocation-profile";
import { RelocationAffordability } from "@/lib/relocation-affordability";
import { AnalyzeResponse, LocationCompareResult } from "@/lib/types";
import {
  buildFactorScorecardHtml,
  buildKpiStripHtml,
  buildReportIntroBlock,
  buildRoundedBarChartHtml,
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
  formatDisplay: (amount: number) => string;
  formatExpense: (amount: number) => string;
  formatReferenceCost: (amount: number) => string;
  referenceCostNote?: string;
  dataSource?: string;
  dataSourceUpdated?: string;
  dataLicense?: string;
  homeMonthlyCostDisplay?: number | null;
  purchasingPowerEntries?: import("@/lib/relocation-composite").PurchasingPowerIndexEntry[];
  compositeEntries?: import("@/lib/relocation-composite").CompositeScoreEntry[];
  financialHealthScore?: number;
};

const TOTAL_PAGES = 4;
const REPORT_LABEL = "Relocation affordability";

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

function pageShell(
  pageNumber: number,
  pageTitle: string,
  body: string,
  privacyNotice: string,
  payload: ReportPayload,
  showIntro = false
) {
  const intro = showIntro
    ? buildReportIntroBlock(
        payload.periodLabel,
        payload.displayCurrency,
        privacyNotice,
        "Relocation affordability based on your scenario income and destination costs."
      )
    : "";

  return buildReportPageShell({
    pageNumber,
    totalPages: TOTAL_PAGES,
    reportLabel: REPORT_LABEL,
    pageTitle,
    body: `${intro}${body}`,
    privacyNotice,
    showPrivacy: false,
    meta: {
      periodLabel: payload.periodLabel,
      displayCurrency: payload.displayCurrency,
    },
  });
}

function buildPurchasingPowerIndexReport(
  homeCity: string,
  entries: PurchasingPowerIndexEntry[]
) {
  if (entries.length < 2) return "";

  const maxIndex = Math.max(...entries.map((entry) => entry.index), 100);
  const colors = ["#4a5568", "#1a6b7c", "#b85c38", "#c9a227", "#2d6a4f"];
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

  return `
    <div class="report-section-bordered report-section-compact pp-index-section">
      <p class="report-kicker">Purchasing power index</p>
      <h2 class="section-title">Same income, indexed against home cost of living (home = 100)</h2>
      <div class="pp-index-chart pp-index-chart-compact">${rows}</div>
      ${example ? `<p class="report-explanatory-callout report-callout-compact">${escapeHtml(example)}</p>` : ""}
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

function buildCompositeScoresReport(entries: CompositeScoreEntry[]) {
  const displayEntries = dedupeCompositeEntries(entries);
  const destinations = displayEntries.filter((entry) => !entry.isHome);
  if (!destinations.length) return "";

  const gaugeColors = ["#4a5568", "#1a6b7c", "#b85c38", "#c9a227", "#2d6a4f"];
  const gauges = displayEntries
    .map((entry, index) => {
      const score = Math.max(0, Math.min(100, entry.financialHealthScore));
      const radius = 28;
      const circumference = 2 * Math.PI * radius;
      const offset = circumference - (score / 100) * circumference;
      const label = entry.isHome
        ? `Home — ${escapeHtml(entry.cityShort)}`
        : escapeHtml(entry.cityShort);
      return `
      <div class="composite-gauge-report composite-gauge-report-compact">
        <svg width="72" height="72" viewBox="0 0 88 88" aria-hidden="true">
          <circle cx="44" cy="44" r="${radius}" fill="none" stroke="#eef4f6" stroke-width="8"></circle>
          <circle cx="44" cy="44" r="${radius}" fill="none" stroke="${gaugeColors[index % gaugeColors.length]}" stroke-width="8" stroke-dasharray="${circumference}" stroke-dashoffset="${offset}" transform="rotate(-90 44 44)"></circle>
          <text x="44" y="47" text-anchor="middle" class="composite-gauge-value">${Math.round(score)}</text>
        </svg>
        <span>${label}</span>
        <span class="composite-gauge-type">Financial health score</span>
      </div>`;
    })
    .join("");

  const cards = destinations
    .map((entry) => {
      const costLabel =
        entry.costVsHomePct > 0
          ? `−${entry.costVsHomePct.toFixed(0)}% cost vs. home`
          : entry.costVsHomePct < 0
            ? `+${Math.abs(entry.costVsHomePct).toFixed(0)}% cost vs. home`
            : "0% cost vs. home";
      return `
      <div class="composite-city-card-report${entry.isBestFit ? " best-fit" : ""}">
        <div class="composite-city-card-head">
          <strong>${escapeHtml(entry.city)}</strong>
          ${entry.isBestFit ? `<span class="composite-best-fit">Best fit</span>` : ""}
        </div>
        <div class="composite-city-score">${entry.relocationLikelihoodScore}</div>
        <p class="composite-score-type">Relocation fit score</p>
        <p>${costLabel} · ${Math.round(entry.purchasingPowerIndex)} purchasing power${
          entry.savingsRunwayMonths !== null
            ? ` · ${entry.savingsRunwayMonths.toFixed(1)} mo savings runway`
            : ""
        }</p>
      </div>`;
    })
    .join("");

  const bestReason = destinations.find((entry) => entry.rankReason)?.rankReason;

  return `
    <div class="report-section-bordered report-section-compact composite-scores-report">
      <p class="report-kicker">Financial health &amp; relocation fit</p>
      <h2 class="section-title">Composite scores — illustrative weighting, not a guarantee</h2>
      <p class="report-explanatory-callout report-callout-compact"><strong>Financial health score</strong> (gauges) uses the same four-factor model as Analyze with what-if income applied. <strong>Relocation fit score</strong> (cards) ranks destinations: cost savings 40%, purchasing power 35%, savings runway 25%.</p>
      <div class="composite-gauge-grid-report composite-gauge-grid-compact">${gauges}</div>
      <div class="composite-card-grid-report composite-card-grid-compact">${cards}</div>
      ${bestReason ? `<p class="report-explanatory-callout report-callout-compact">${escapeHtml(bestReason)}</p>` : ""}
      <p class="report-explanatory-callout report-callout-compact composite-footnote">${escapeHtml(RELOCATION_COMPOSITE_FOOTNOTE)}</p>
    </div>`;
}

function adjustmentChart(
  income: number,
  cost: number,
  balance: number,
  destCity: string,
  formatDisplay: (amount: number) => string
) {
  const max = Math.max(income, cost, Math.abs(balance), 1);
  const incomeW = Math.round((income / max) * 100);
  const costW = Math.round((cost / max) * 100);
  const balanceW = Math.round((Math.abs(balance) / max) * 100);

  return `
    <div class="report-section-bordered">
    <h2 class="section-title">Affordability adjustment</h2>
    <div class="adjustment-chart">
      <div class="adj-row">
        <div class="adj-label">Scenario monthly income (after exchange & what-if)</div>
        <div class="adj-bar-wrap">
          <div class="adj-bar income" style="width:${incomeW}%"></div>
        </div>
        <div class="adj-value">${formatDisplay(income)}</div>
      </div>
      <div class="adj-row">
        <div class="adj-label">Est. cost in ${escapeHtml(destCity)}</div>
        <div class="adj-bar-wrap">
          <div class="adj-bar cost" style="width:${costW}%"></div>
        </div>
        <div class="adj-value">${formatDisplay(cost)}</div>
      </div>
      <div class="adj-row">
        <div class="adj-label">Projected monthly balance</div>
        <div class="adj-bar-wrap">
          <div class="adj-bar ${balance >= 0 ? "balance-pos" : "balance-neg"}" style="width:${balanceW}%"></div>
        </div>
        <div class="adj-value ${balance >= 0 ? "pos" : "neg"}">${balance >= 0 ? "+" : ""}${formatDisplay(balance)}</div>
      </div>
    </div>
    <div class="legend">
      <span><i class="swatch income"></i> Scenario income</span>
      <span><i class="swatch cost"></i> Destination cost</span>
      <span><i class="swatch ${balance >= 0 ? "balance-pos" : "balance-neg"}"></i> Projected balance</span>
    </div>
    </div>`;
}

function buildPageOne(payload: ReportPayload) {
  const dest = payload.bestFitCity;
  const aff = payload.affordability;
  const destLabel = dest.split(",")[0]?.trim() ?? dest;
  const factorScores = aff ? computeRelocationOverviewScores(aff) : null;
  const displayScore = aff?.score ?? factorScores?.heroScore ?? 0;
  const tone = scoreBandTone(displayScore);

  const body = `
    <div class="hero-zone">
      <div class="score-hero score-hero-${tone}">
        <div class="score-hero-main">
          <div class="score-hero-value">${displayScore}</div>
          <div class="score-hero-band">${escapeHtml(scoreBandLabel(displayScore, "relocation"))}</div>
          <div class="score-hero-name">Relocation affordability score</div>
          ${aff ? `<p class="score-hero-summary">${escapeHtml(aff.summary)}</p>` : ""}
        </div>
        <div class="score-hero-factors">
          ${factorScores ? buildFactorScorecardHtml("Savings rate fit", factorScores.savingsRateFit, undefined) : ""}
          ${factorScores ? buildFactorScorecardHtml("Income vs cost", factorScores.incomeVsCost, undefined) : ""}
          ${factorScores ? buildFactorScorecardHtml("Balance outlook", factorScores.balanceOutlook, undefined) : ""}
        </div>
      </div>
      ${buildKpiStripHtml([
        { label: "Current city", value: escapeHtml(payload.baseCity) },
        { label: "Best-fit city", value: escapeHtml(dest), tone: "good" },
        {
          label: "Projected balance",
          value: aff
            ? `${aff.projectedBalance >= 0 ? "+" : ""}${payload.formatDisplay(aff.projectedBalance)}`
            : "—",
          tone: aff && aff.projectedBalance >= 0 ? "good" : "mid",
        },
      ])}
    </div>
    ${
      aff
        ? adjustmentChart(
            aff.scenarioIncomeDisplay,
            aff.displayReferenceCost,
            aff.projectedBalance,
            destLabel,
            payload.formatDisplay
          )
        : ""
    }
  `;

  return pageShell(
    1,
    "Relocation overview",
    body,
    getReportPrivacyNotice(payload.data.privacy_notice),
    payload,
    true
  );
}

function buildPageTwo(payload: ReportPayload) {
  const body =
    payload.compositeEntries?.length
      ? buildCompositeScoresReport(payload.compositeEntries)
      : `<p class="muted-note">Run a city comparison in the app to populate composite scores.</p>`;

  return pageShell(
    2,
    "Financial health & relocation fit",
    body,
    getReportPrivacyNotice(payload.data.privacy_notice),
    payload
  );
}

function buildPageThree(payload: ReportPayload) {
  const body = `
    ${
      payload.purchasingPowerEntries?.length
        ? buildPurchasingPowerIndexReport(payload.baseCity, payload.purchasingPowerEntries)
        : ""
    }
    <div class="hero-zone hero-zone-compact">
      ${buildRelocationStory(payload)}
      ${buildRelocationMetricsStrip(payload)}
    </div>
  `;

  return pageShell(
    3,
    "Spending vs best-fit city",
    body,
    getReportPrivacyNotice(payload.data.privacy_notice),
    payload
  );
}

function buildPageFour(payload: ReportPayload) {
  const body = `${buildCityProfileTable(payload.bestFitCity, payload)}${buildLargestCategoryGaps(payload)}`;

  return pageShell(
    4,
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

function buildRelocationMetricsStrip(payload: ReportPayload) {
  const aff = payload.affordability;
  const userTotal = userSpendingTotal(payload.userBenchmarkSpending);
  const destTotal =
    payload.primaryResult?.reference_monthly_total ?? aff?.displayReferenceCost ?? 0;
  const spendingGap = userTotal - destTotal;

  return buildKpiStripHtml([
    {
      label: "Scenario income",
      value: aff ? payload.formatDisplay(aff.scenarioIncomeDisplay) : "—",
      tone: "good",
    },
    {
      label: "Destination cost",
      value: aff ? payload.formatDisplay(aff.displayReferenceCost) : payload.formatReferenceCost(destTotal),
    },
    {
      label: "Your spending total",
      value: payload.formatExpense(userTotal),
    },
    {
      label: "Monthly cost gap",
      value: `${spendingGap >= 0 ? "+" : ""}${payload.formatDisplay(spendingGap)}`,
      tone: spendingGap > 0 ? "good" : spendingGap < 0 ? "mid" : "neutral",
    },
    {
      label: "Projected balance",
      value: aff
        ? `${aff.projectedBalance >= 0 ? "+" : ""}${payload.formatDisplay(aff.projectedBalance)}`
        : "—",
      tone: aff && aff.projectedBalance >= 0 ? "good" : "mid",
    },
    {
      label: "Savings runway",
      value:
        payload.readiness.runwayMonths !== null
          ? `${payload.readiness.runwayMonths.toFixed(1)} mo`
          : "—",
    },
  ]);
}

function buildRelocationStory(payload: ReportPayload) {
  const aff = payload.affordability;
  const result = payload.primaryResult;
  const destCity = payload.bestFitCity;
  const destShort = cityShortName(destCity);
  const userTotal = userSpendingTotal(payload.userBenchmarkSpending);
  const destTotal = result?.reference_monthly_total ?? aff?.displayReferenceCost ?? 0;
  const spendingDelta = userTotal - destTotal;

  let topReliefCategory = "";
  let topReliefAmount = 0;
  if (result) {
    for (const category of BENCHMARK_CATEGORIES) {
      const userAmount = payload.userBenchmarkSpending[category.key] ?? 0;
      const referenceAmount =
        (result.reference_benchmarks[category.key] ?? 0) * result.household_size;
      const relief = userAmount - referenceAmount;
      if (relief > topReliefAmount) {
        topReliefAmount = relief;
        topReliefCategory = category.label;
      }
    }
  }

  const paragraphs: string[] = [];

  paragraphs.push(
    `For <strong>${escapeHtml(payload.periodLabel)}</strong>, your tracked monthly spending totals <strong>${payload.formatExpense(userTotal)}</strong> across rent, groceries, transport, and the other benchmark categories shown below. <strong>This total does not include mortgage payment</strong> or expenses outside the relocation comparison matrix. For your scenario, <strong>${escapeHtml(destCity)}</strong> ranks #1 with an estimated monthly living cost of <strong>${payload.formatReferenceCost(destTotal)}/mo</strong> for a ${payload.householdSize}-person ${escapeHtml(payload.lifestyleLabel.toLowerCase())} lifestyle — built from live city price data (WhereNext), not a single rent quote. ${escapeHtml(payload.referenceCostNote ?? MONTHLY_BENCHMARK_NOTE)}`
  );

  if (spendingDelta > 0) {
    paragraphs.push(
      `That suggests roughly <strong>${payload.formatDisplay(spendingDelta)}</strong> more room in your monthly budget versus your current spending pattern — before factoring in income changes.`
    );
  } else if (spendingDelta < 0) {
    paragraphs.push(
      `Reference costs in ${escapeHtml(destShort)} run about <strong>${payload.formatDisplay(Math.abs(spendingDelta))}</strong> higher than your current category spending, so lifestyle adjustments may be needed.`
    );
  }

  if (aff) {
    paragraphs.push(
      `With scenario income of <strong>${payload.formatDisplay(aff.scenarioIncomeDisplay)}</strong>, you would project a <strong class="${aff.projectedBalance >= 0 ? "pos" : "neg"}">${aff.projectedBalance >= 0 ? "+" : ""}${payload.formatDisplay(aff.projectedBalance)}</strong> monthly balance (${escapeHtml(aff.verdictLabel)}).`
    );
  }

  if (topReliefCategory && topReliefAmount > 0) {
    paragraphs.push(
      `The biggest category opportunity is <strong>${escapeHtml(topReliefCategory)}</strong>, where your spending is <strong>${payload.formatExpense(topReliefAmount)}</strong> above the ${escapeHtml(destShort)} reference.`
    );
  }

  if (payload.readiness.runwayMonths !== null) {
    paragraphs.push(
      `<strong>Savings runway:</strong> About <strong>${payload.readiness.runwayMonths.toFixed(1)} months</strong> — how long current savings would last with zero income at your current monthly expenses. <strong>Move-readiness score:</strong> <strong>${payload.readiness.moveReadinessPct.toFixed(0)}%</strong> — your monthly surplus expressed as a share of expenses (higher means more room to absorb a cost increase).${payload.timeline ? ` You selected a timeline of <strong>${escapeHtml(timelineLabel(payload.timeline))}</strong>.` : ""} ${escapeHtml(payload.readiness.moveReadinessLabel)}`
    );
  }

  return `
    <div class="relocation-story-box relocation-story-box-large">
      <h2 class="section-title">What this means for your move</h2>
      ${paragraphs.map((paragraph) => `<p class="relocation-story-paragraph">${paragraph}</p>`).join("")}
    </div>`;
}

function buildCityProfileTable(city: string, payload: ReportPayload) {
  const profile = getCityProfile(city);
  const destShort = cityShortName(city);

  const rows = CITY_PROFILE_STAT_ROWS.map(
    (row, index) => `
    <tr class="${index % 2 === 0 ? "stripe" : ""}">
      <th scope="row">${escapeHtml(row.label)}</th>
      <td>${escapeHtml(profile[row.key] ?? "—")}</td>
    </tr>`
  ).join("");

  return `
    <div class="report-section-bordered chart-panel">
      <h2 class="section-title">About ${escapeHtml(destShort)}</h2>
      <p class="muted-note">Indicative city profile for relocation planning — verify locally before deciding.</p>
      <table class="city-profile-table report-table-styled">
        <tbody>${rows}</tbody>
      </table>
      ${profile.notes ? `<p class="muted-note">${escapeHtml(profile.notes)}</p>` : ""}
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
      </div>
    </div>`;
}

function buildLargestCategoryGaps(payload: ReportPayload) {
  const compareResult = payload.primaryResult;
  const comparisons = compareResult?.comparisons ?? [];
  if (!comparisons.length) {
    return `<p class="muted-note">Run a city comparison in the app to populate category gaps.</p>`;
  }

  const hasRentInRecords = (payload.userBenchmarkSpending.rent ?? 0) > 0;
  const filtered = comparisons.filter((row) => {
    const key = row.category.toLowerCase();
    const userAmount = payload.userBenchmarkSpending[key] ?? 0;
    if (userAmount > 0) return true;
    if (key === "rent" && !hasRentInRecords) return true;
    return false;
  });

  if (!filtered.length) {
    return `<p class="muted-note">No category gaps with uploaded spending data for this comparison.</p>`;
  }

  return `
    <div class="chart-panel report-section-bordered gap-chart-compact">
      <h2 class="section-title">Largest category gaps</h2>
      ${buildRoundedBarChartHtml(
        [...filtered]
          .sort((a, b) => Math.abs(b.difference_pct) - Math.abs(a.difference_pct))
          .slice(0, 5)
          .map((row) => ({
            label: row.category,
            value: Math.abs(row.difference_pct),
          })),
        (value) => `${value.toFixed(1)}%`
      )}
    </div>`;
}

export function buildRelocationReportHtml(payload: ReportPayload) {
  const body = `${buildPageOne(payload)}${buildPageTwo(payload)}${buildPageThree(payload)}${buildPageFour(payload)}`;
  return buildReportDocument(`${REPORT_LABEL} Report`, body);
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
