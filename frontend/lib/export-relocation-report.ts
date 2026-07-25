import { CityAffordabilitySummary } from "@/lib/relocation-scenario";
import { RelocationReadiness, RelocationTimeline } from "@/lib/relocation-profile";
import { RelocationAffordability } from "@/lib/relocation-affordability";
import { AnalyzeResponse, LocationCompareResult, LocationComparison } from "@/lib/types";
import {
  buildReportDocument,
  buildReportPageShell,
  downloadReportPdf,
  escapeHtml,
  reportPreparedLine,
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
  formatDisplay: (amount: number) => string;
  formatExpense: (amount: number) => string;
  formatReferenceCost: (amount: number) => string;
};

const TOTAL_PAGES = 2;
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

function pageShell(pageNumber: number, pageTitle: string, body: string, privacyNotice: string) {
  return buildReportPageShell({
    pageNumber,
    totalPages: TOTAL_PAGES,
    reportLabel: REPORT_LABEL,
    pageTitle,
    body,
    privacyNotice,
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
  const incomeScenario =
    payload.incomeChangePct === 0
      ? "Same income after moving"
      : `${payload.incomeChangePct > 0 ? "+" : ""}${payload.incomeChangePct}% income after moving`;

  const costDiffPct =
    aff && aff.displayExpenses > 0
      ? ((aff.displayReferenceCost - aff.displayExpenses) / aff.displayExpenses) * 100
      : 0;

  const destLabel = dest.split(",")[0]?.trim() ?? dest;

  const body = `
    ${reportPreparedLine(payload.generatedAt, payload.periodLabel, payload.displayCurrency)}
    <div class="meta-grid">
      <div><span>Your current city</span><strong>${escapeHtml(payload.baseCity)}</strong></div>
      <div><span>Best-fit city</span><strong>${escapeHtml(dest)}</strong></div>
      <div><span>Household size</span><strong>${payload.householdSize} ${payload.householdSize === 1 ? "person" : "people"}</strong></div>
      <div><span>Lifestyle profile</span><strong>${escapeHtml(payload.lifestyleLabel)}</strong></div>
      <div><span>Income scenario</span><strong>${escapeHtml(incomeScenario)}</strong></div>
      <div><span>Relocation timeline</span><strong>${escapeHtml(timelineLabel(payload.timeline))}</strong></div>
    </div>

    <table class="summary-table">
      <tbody>
        <tr>
          <td>Scenario monthly income (after currency exchange & what-if)</td>
          <td><strong>${aff ? payload.formatDisplay(aff.scenarioIncomeDisplay) : "—"}</strong></td>
        </tr>
        <tr>
          <td>Estimated monthly cost in ${escapeHtml(destLabel)}</td>
          <td>
            <span class="pct-pill">${formatPct(costDiffPct)}</span>
            <strong>${aff ? payload.formatDisplay(aff.displayReferenceCost) : "—"}</strong>
          </td>
        </tr>
        <tr class="highlight-row">
          <td>Projected monthly balance</td>
          <td class="${(aff?.projectedBalance ?? 0) >= 0 ? "pos" : "neg"}">
            <strong>${aff ? `${aff.projectedBalance >= 0 ? "+" : ""}${payload.formatDisplay(aff.projectedBalance)}` : "—"}</strong>
            ${aff ? `<div class="sub-val">${escapeHtml(aff.verdictLabel)} · Relocation affordability score ${aff.score}/100</div>` : ""}
          </td>
        </tr>
      </tbody>
    </table>

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

    <div class="verdict-box">
      <strong>Relocation affordability score: ${aff ? `${aff.score}/100 — ${escapeHtml(aff.verdictLabel)}` : "Not calculated"}</strong>
      <p class="section-explanation">Relocation affordability measures whether destination costs fit your scenario income. Your overall financial health score (${payload.data.health_score.overall}/100 — ${escapeHtml(payload.data.health_score.summary)}) measures savings habits and spending patterns. These are different scores and can both be high.</p>
      ${aff?.tips[0] ? `<p class="section-explanation">${escapeHtml(aff.tips[0])}</p>` : ""}
      ${aff ? `<p class="section-explanation">${escapeHtml(aff.summary)}</p>` : "<p class=\"section-explanation\">Compare cities in the app to generate a verdict.</p>"}
    </div>

    ${topRecommendationsTable(payload.topRecommendations, payload.formatDisplay)}
  `;

  return pageShell(1, "Relocation overview", body, getReportPrivacyNotice(payload.data.privacy_notice));
}

function categoryIndexTable(
  comparisons: LocationComparison[],
  destinationCity: string,
  formatExpense: (amount: number) => string,
  formatReferenceCost: (amount: number) => string
) {
  if (!comparisons.length) {
    return `<p class="section-explanation">Run a city comparison in the app to populate category data.</p>`;
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

  const rows = comparisons
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

  const chartBars = comparisons
    .slice(0, 6)
    .map((row) => {
      const aboveReference = row.difference_pct > 0;
      const height = Math.min(100, Math.abs(row.difference_pct) * 2);
      const barColor = aboveReference ? "#c0392b" : "#1a8a9e";
      return `
      <div class="col-bar-wrap">
        <div class="col-bar ${aboveReference ? "down" : "up"}" style="height:${height}%;background:${barColor}"></div>
        <span>${escapeHtml(row.category.slice(0, 8))}</span>
      </div>`;
    })
    .join("");

  return `
    <h2 class="section-title">Category comparison</h2>
    <p class="section-explanation">${narrative}</p>
    <table class="index-table">
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
          <td><strong>Total monthly comparison</strong></td>
          <td><strong>${formatExpense(totalUser)}</strong></td>
          <td><strong>${formatReferenceCost(totalRef)}</strong></td>
          <td><strong>${formatPct(totalDiff)}</strong></td>
        </tr>
      </tbody>
    </table>
    <div class="column-chart">
      <div class="y-axis">
        <span>+50%</span><span>0%</span><span>-50%</span>
      </div>
      <div class="columns">${chartBars}</div>
    </div>
    <div class="legend centered">
      <span><i class="swatch primary"></i> Below ${escapeHtml(destLabel)} reference (you spend less)</span>
      <span><i class="swatch danger"></i> Above ${escapeHtml(destLabel)} reference (you spend more)</span>
    </div>`;
}

function topRecommendationsTable(
  recommendations: ReportRecommendation[],
  formatDisplay: (amount: number) => string
) {
  if (!recommendations.length) {
    return `<p class="section-explanation">Run <strong>Find best-fit cities</strong> in the app to populate recommended destinations.</p>`;
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
    <h2 class="section-title">Top 3 recommended cities for your budget</h2>
    <p class="section-explanation">Ranked by projected monthly balance based on your spending, income scenario, and lifestyle preferences.</p>
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
    <p class="section-explanation">Ranked by projected monthly balance — highest balance first.</p>
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

function buildPageTwo(payload: ReportPayload) {
  const comparisons = payload.primaryResult?.comparisons ?? [];
  const tip = payload.affordability?.tips[0];
  const compareCity = payload.primaryResult?.reference_city ?? payload.bestFitCity;
  const relocationScore = payload.affordability?.score;

  const body = `
    ${cityContextBlock(payload.baseCity, payload.bestFitCity)}
    ${categoryIndexTable(
      comparisons,
      compareCity,
      payload.formatExpense,
      payload.formatReferenceCost
    )}
    ${cityRankTable(payload.citySummaries, payload.topRecommendations.slice(3), payload.formatDisplay)}
    <div class="readiness-strip">
      <div><span>Relocation affordability score</span><strong>${relocationScore !== undefined ? `${relocationScore}/100` : "—"}</strong></div>
      <div><span>Move readiness score</span><strong>${payload.readiness.moveReadinessPct.toFixed(0)}%</strong></div>
      <div><span>Runway</span><strong>${payload.readiness.runwayMonths !== null ? `${payload.readiness.runwayMonths.toFixed(1)} mo` : "—"}</strong></div>
    </div>
    ${tip ? `<div class="tip-box">${escapeHtml(tip)}</div>` : ""}
  `;

  return pageShell(
    2,
    "Category & city comparison",
    body,
    getReportPrivacyNotice(payload.data.privacy_notice)
  );
}

export function buildRelocationReportHtml(payload: ReportPayload) {
  const body = `${buildPageOne(payload)}${buildPageTwo(payload)}`;
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
