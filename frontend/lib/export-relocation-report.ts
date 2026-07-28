import { BENCHMARK_CATEGORIES } from "@/lib/benchmark-categories";
import { getCategoryPdfSymbol } from "@/lib/category-icons";
import { CITY_PROFILE_STAT_ROWS, getCityProfile } from "@/lib/city-profiles";
import { CityAffordabilitySummary } from "@/lib/relocation-scenario";
import { RelocationReadiness, RelocationTimeline } from "@/lib/relocation-profile";
import { RelocationAffordability } from "@/lib/relocation-affordability";
import { AnalyzeResponse, LocationCompareResult, LocationComparison } from "@/lib/types";
import {
  buildFactorScorecardHtml,
  buildKpiStripHtml,
  buildReportIntroBlock,
  buildRoundedBarChartHtml,
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
import { applyRecommendationRankScores } from "@/lib/city-recommender";

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
};

const TOTAL_PAGES = 3;
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
        payload.generatedAt,
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
      generatedAt: payload.generatedAt,
      periodLabel: payload.periodLabel,
      displayCurrency: payload.displayCurrency,
    },
  });
}

function cityContextBlock(baseCity: string, bestFitCity: string) {
  return `
    <div class="meta-grid city-context-grid">
      <div><span>Your current city</span><strong>${escapeHtml(baseCity)}</strong></div>
      <div><span>Best-fit city</span><strong>${escapeHtml(bestFitCity)}</strong></div>
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
    </div>`;
}

function buildPageOne(payload: ReportPayload) {
  const dest = payload.bestFitCity;
  const aff = payload.affordability;
  const destLabel = dest.split(",")[0]?.trim() ?? dest;
  const rankedTop = applyRecommendationRankScores(
    payload.topRecommendations.map((entry) => ({
      city: entry.city,
      score: entry.score,
      projectedBalance: entry.projectedBalance,
      referenceMonthlyCost: entry.referenceMonthlyCost,
      verdictLabel: entry.verdictLabel,
    }))
  );
  const displayScore = rankedTop[0]?.score ?? aff?.score ?? 0;
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
          ${aff ? buildFactorScorecardHtml("Savings rate fit", Math.min(100, Math.max(0, Math.round((aff.projectedBalance / Math.max(aff.scenarioIncomeDisplay, 1)) * 100 + 50))), undefined) : ""}
          ${aff ? buildFactorScorecardHtml("Income vs cost", Math.min(100, Math.max(0, Math.round((aff.scenarioIncomeDisplay / Math.max(aff.displayReferenceCost, 1)) * 50))), undefined) : ""}
          ${aff ? buildFactorScorecardHtml("Balance outlook", aff.projectedBalance >= 0 ? 85 : 35, undefined) : ""}
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
    ${topRecommendationsTable(rankedTop, payload.formatDisplay)}
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

function categoryIndexTable(
  comparisons: LocationComparison[],
  destinationCity: string,
  formatExpense: (amount: number) => string,
  formatReferenceCost: (amount: number) => string
) {
  if (!comparisons.length) {
    return `<p class="muted-note">Run a city comparison in the app to populate category data.</p>`;
  }

  const totalUser = comparisons.reduce((sum, row) => sum + row.user_amount, 0);
  const totalRef = comparisons.reduce((sum, row) => sum + row.reference_amount, 0);
  const totalDiff = totalRef ? ((totalUser - totalRef) / totalRef) * 100 : 0;
  const destLabel = destinationCity.split(",")[0]?.trim() ?? destinationCity;

  const narrative =
    totalDiff > 0
      ? `Your spending is ${formatPct(totalDiff)} above reference averages in ${escapeHtml(destinationCity)} across tracked categories.`
      : totalDiff < 0
        ? `Your spending is ${formatPct(Math.abs(totalDiff), false)} below reference averages in ${escapeHtml(destinationCity)} across tracked categories.`
        : `Your spending is near reference averages in ${escapeHtml(destinationCity)}.`;

  const sorted = [...comparisons].sort(
    (a, b) => Math.abs(b.difference_pct) - Math.abs(a.difference_pct)
  );
  const topComparisons = sorted.slice(0, 5);

  const rows = topComparisons
    .map(
      (row, index) => `
      <tr class="${index % 2 === 0 ? "stripe" : ""}">
        <td>${escapeHtml(row.category)}</td>
        <td>${formatExpense(row.user_amount)}</td>
        <td>${formatReferenceCost(row.reference_amount)}</td>
        <td class="${row.difference_pct > 0 ? "neg" : row.difference_pct < 0 ? "pos" : ""}">${formatPct(row.difference_pct)}</td>
      </tr>`
    )
    .join("");

  const chartBars = buildRoundedBarChartHtml(
    topComparisons.map((row) => ({
      label: row.category,
      value: Math.abs(row.difference_pct),
    })),
    (value) => `${value.toFixed(1)}%`
  );

  return `
    <div class="section-block">
      <h2 class="section-title">Category comparison</h2>
      <p class="muted-note">${narrative}</p>
      <table class="index-table summary-table-compact">
        <thead>
          <tr>
            <th>Category</th>
            <th>Your spending</th>
            <th>${escapeHtml(destLabel)} avg.</th>
            <th>Difference</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
          <tr class="total-row">
            <td><strong>Total</strong></td>
            <td><strong>${formatExpense(totalUser)}</strong></td>
            <td><strong>${formatReferenceCost(totalRef)}</strong></td>
            <td class="${totalDiff > 0 ? "neg" : totalDiff < 0 ? "pos" : ""}"><strong>${formatPct(totalDiff)}</strong></td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="chart-panel section-block-loose">
      <h2 class="section-title">Top 5 category gaps</h2>
      ${chartBars}
    </div>`;
}

function topRecommendationsTable(
  recommendations: ReportRecommendation[],
  formatDisplay: (amount: number) => string
) {
  if (!recommendations.length) {
    return `<p class="muted-note">Run <strong>Find best-fit cities</strong> in the app to populate recommended destinations.</p>`;
  }

  const rows = recommendations
    .map(
      (entry, index) => `
    <tr class="${index % 2 === 0 ? "stripe" : ""}">
      <td>#${index + 1} ${escapeHtml(entry.city)}</td>
      <td>${formatDisplay(entry.referenceMonthlyCost)}</td>
      <td class="${entry.projectedBalance >= 0 ? "pos" : "neg"}">${entry.projectedBalance >= 0 ? "+" : ""}${formatDisplay(entry.projectedBalance)}</td>
      <td>${entry.score}/100</td>
      <td>${escapeHtml(entry.verdictLabel)}</td>
    </tr>`
    )
    .join("");

  return `
    <div class="section-block">
      <h2 class="section-title">Top 3 recommended cities</h2>
      <table class="index-table compact">
      <thead>
        <tr>
          <th>City</th>
          <th>Est. cost</th>
          <th>Balance</th>
          <th>Relocation affordability score</th>
          <th>Verdict</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function cityRankTable(
  summaries: CityAffordabilitySummary[],
  topRecommendations: ReportRecommendation[],
  formatDisplay: (amount: number) => string
) {
  if (topRecommendations.length) {
    return topRecommendationsTable(topRecommendations, formatDisplay);
  }

  if (!summaries.length) return "";

  const sorted = [...summaries].sort(
    (a, b) => b.affordability.projectedBalance - a.affordability.projectedBalance
  );

  const rows = sorted
    .map(
      (entry, index) => `
    <tr class="${index % 2 === 0 ? "stripe" : ""}">
      <td>#${index + 1} ${escapeHtml(entry.city)}</td>
      <td>${formatDisplay(entry.affordability.displayReferenceCost)}</td>
      <td class="${entry.affordability.projectedBalance >= 0 ? "pos" : "neg"}">${entry.affordability.projectedBalance >= 0 ? "+" : ""}${formatDisplay(entry.affordability.projectedBalance)}</td>
      <td>${entry.affordability.score}/100</td>
      <td>${escapeHtml(entry.affordability.verdictLabel)}</td>
    </tr>`
    )
    .join("");

  return `
    <h2 class="section-title">City rankings</h2>
    <table class="index-table compact">
      <thead>
        <tr>
          <th>City</th>
          <th>Est. cost</th>
          <th>Balance</th>
          <th>Relocation affordability score</th>
          <th>Verdict</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function cityShortName(city: string) {
  return city.split(",")[0]?.trim() ?? city;
}

function userSpendingTotal(spending: Record<string, number>) {
  return BENCHMARK_CATEGORIES.reduce((sum, category) => sum + (spending[category.key] ?? 0), 0);
}

function buildBenchmarkMatrixTable(
  payload: ReportPayload,
  compareResult: LocationCompareResult
) {
  const destShort = cityShortName(compareResult.reference_city);
  const spending = payload.userBenchmarkSpending;
  const userTotal = userSpendingTotal(spending);
  const destTotal = compareResult.reference_monthly_total;

  const rows = BENCHMARK_CATEGORIES.map((category, index) => {
    const userAmount = spending[category.key] ?? 0;
    const benchmark = compareResult.reference_benchmarks[category.key] ?? 0;
    const adjusted = benchmark * compareResult.household_size;
    const symbol = getCategoryPdfSymbol(category.label);

    return `
      <tr class="${index % 2 === 0 ? "stripe" : ""}">
        <td>
          <span class="benchmark-category-label">${symbol} ${escapeHtml(category.label)}</span>
        </td>
        <td><span class="spending-pill">${payload.formatExpense(userAmount)}</span></td>
        <td>
          <div class="benchmark-city-cell">
            <div class="benchmark-value-box">${Math.round(benchmark)}</div>
            <div class="benchmark-mo">${payload.formatReferenceCost(adjusted)}/mo</div>
          </div>
        </td>
      </tr>`;
  }).join("");

  return `
    <div class="section-block">
      <div class="section-heading-row">
        <h2 class="section-title">Your spending vs ${escapeHtml(destShort)}</h2>
        <span class="period-chip">${escapeHtml(payload.periodLabel)}</span>
      </div>
      <p class="muted-note">Category breakdown for your selected period compared to live reference costs in your #1 recommended city.</p>
      <table class="benchmark-matrix-table">
        <thead>
          <tr>
            <th>Category</th>
            <th>Your spending</th>
            <th>${escapeHtml(destShort)}</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
          <tr class="benchmark-total-row">
            <td><strong>Total monthly</strong></td>
            <td><span class="spending-pill spending-pill-total"><strong>${payload.formatExpense(userTotal)}</strong></span></td>
            <td><strong>${payload.formatReferenceCost(destTotal)}</strong></td>
          </tr>
        </tbody>
      </table>
    </div>`;
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
      label: "Move readiness",
      value: `${payload.readiness.moveReadinessPct.toFixed(0)}%`,
      tone: payload.readiness.moveReadinessPct >= 70 ? "good" : "mid",
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
    `For <strong>${escapeHtml(payload.periodLabel)}</strong>, your tracked monthly spending totals <strong>${payload.formatExpense(userTotal)}</strong> across rent, groceries, transport, and other core categories. Based on your scenario, <strong>${escapeHtml(destCity)}</strong> ranks #1 with reference costs around <strong>${payload.formatReferenceCost(destTotal)}/mo</strong> for a ${payload.householdSize}-person ${escapeHtml(payload.lifestyleLabel.toLowerCase())} lifestyle.`
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
      `You currently have about <strong>${payload.readiness.runwayMonths.toFixed(1)} months</strong> of runway and a move-readiness score of <strong>${payload.readiness.moveReadinessPct.toFixed(0)}%</strong>${payload.timeline ? ` with a timeline of <strong>${escapeHtml(timelineLabel(payload.timeline))}</strong>` : ""}.`
    );
  }

  return `
    <div class="relocation-story-box">
      <h2 class="section-title">What this means for your move</h2>
      ${paragraphs.map((paragraph) => `<p class="relocation-story-paragraph">${paragraph}</p>`).join("")}
    </div>`;
}

function buildCityProfileTable(city: string) {
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
    <div class="section-block chart-panel">
      <h2 class="section-title">About ${escapeHtml(destShort)}</h2>
      <p class="muted-note">Indicative city profile for relocation planning — verify locally before deciding.</p>
      <table class="city-profile-table">
        <tbody>${rows}</tbody>
      </table>
      ${profile.notes ? `<p class="muted-note">${escapeHtml(profile.notes)}</p>` : ""}
    </div>`;
}

function buildPageTwo(payload: ReportPayload) {
  const compareResult = payload.primaryResult;
  const comparisons = compareResult?.comparisons ?? [];

  const matrixBlock = compareResult
      ? buildBenchmarkMatrixTable(payload, compareResult)
      : `<p class="muted-note">Run a city comparison in the app to populate your spending vs destination costs.</p>`;

  const gapChart =
    comparisons.length > 0
      ? `
    <div class="chart-panel section-block-loose">
      <h2 class="section-title">Largest category gaps</h2>
      ${buildRoundedBarChartHtml(
        [...comparisons]
          .sort((a, b) => Math.abs(b.difference_pct) - Math.abs(a.difference_pct))
          .slice(0, 5)
          .map((row) => ({
            label: row.category,
            value: Math.abs(row.difference_pct),
          })),
        (value) => `${value.toFixed(1)}%`
      )}
    </div>`
      : "";

  const body = `
    <div class="hero-zone">
      ${buildRelocationStory(payload)}
      ${buildRelocationMetricsStrip(payload)}
    </div>
    ${cityContextBlock(payload.baseCity, payload.bestFitCity)}
    ${matrixBlock}
    ${gapChart}
  `;

  return pageShell(
    2,
    "Spending vs best-fit city",
    body,
    getReportPrivacyNotice(payload.data.privacy_notice),
    payload
  );
}

function buildPageThree(payload: ReportPayload) {
  const tip = payload.affordability?.tips[0];
  const relocationScore = payload.affordability?.score;
  const aff = payload.affordability;

  const body = `
    ${buildCityProfileTable(payload.bestFitCity)}
    <div class="meta-grid city-context-grid section-block">
      <div><span>Household size</span><strong>${payload.householdSize}</strong></div>
      <div><span>Lifestyle</span><strong>${escapeHtml(payload.lifestyleLabel)}</strong></div>
      <div><span>Timeline</span><strong>${escapeHtml(timelineLabel(payload.timeline))}</strong></div>
      <div><span>Income adjustment</span><strong>${formatPct(payload.incomeChangePct)}</strong></div>
    </div>
    ${buildKpiStripHtml([
      {
        label: "Relocation score",
        value: relocationScore !== undefined ? `${relocationScore}/100` : "—",
        tone: relocationScore !== undefined && relocationScore >= 65 ? "good" : "mid",
      },
      {
        label: "Move readiness",
        value: `${payload.readiness.moveReadinessPct.toFixed(0)}%`,
      },
      {
        label: "Runway",
        value:
          payload.readiness.runwayMonths !== null
            ? `${payload.readiness.runwayMonths.toFixed(1)} mo`
            : "—",
      },
    ])}
    ${
      aff?.tips.length
        ? `<div class="section-block"><h2 class="section-title">Recommendations</h2><ul class="report-tip-list">${aff.tips.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></div>`
        : ""
    }
    ${tip ? `<div class="tip-box">${escapeHtml(tip)}</div>` : ""}
  `;

  return pageShell(
    3,
    "Relocation readiness",
    body,
    getReportPrivacyNotice(payload.data.privacy_notice),
    payload
  );
}

export function buildRelocationReportHtml(payload: ReportPayload) {
  const body = `${buildPageOne(payload)}${buildPageTwo(payload)}${buildPageThree(payload)}`;
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
