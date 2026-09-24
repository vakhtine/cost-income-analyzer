import { analyzeFileInBrowser } from "@/lib/analyze-client";
import { recommendCitiesForSpending } from "@/lib/city-recommender";
import {
  compareMultipleCities,
  fetchCityMonthlyCost,
  fetchCityRentEstimate,
  getUserBenchmarkSpending,
  MONTHLY_BENCHMARK_NOTE,
  SUPPORTED_REFERENCE_CITIES,
} from "@/lib/city-data";
import { totalBenchmarkCategorySpending } from "@/lib/benchmark-categories";
import { CustomReportPayload } from "@/lib/export-custom-reports";
import { ReportPayload } from "@/lib/export-relocation-report";
import { adjustHealthScoreForScenarioIncome } from "@/lib/health-score";
import { healthScoreForPeriodSelection } from "@/lib/rebuild";
import {
  buildCompositeScoreEntries,
  buildPurchasingPowerIndexEntries,
} from "@/lib/relocation-composite";
import {
  calculateCityRelocationReadiness,
  RelocationTimeline,
} from "@/lib/relocation-profile";
import {
  applyScenarioToLocationResult,
  buildCitySummaries,
  computeScenarioAffordability,
  RelocationScenario,
} from "@/lib/relocation-scenario";
import { lifestyleMultiplier, LifestyleLevel } from "@/lib/wizard";
import { AnalyzeResponse, PeriodAnalysis } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

export const SAMPLE_CSV_PATH = "/sample-multi-month-transactions.csv";

const PREVIEW_BASE_CITY = SUPPORTED_REFERENCE_CITIES[0];
const PREVIEW_COMPARE_CITIES = SUPPORTED_REFERENCE_CITIES.slice(1, 4);
const PREVIEW_HOUSEHOLD_SIZE = 2;
const PREVIEW_INCOME_CHANGE_PCT = 0;
const PREVIEW_LIFESTYLE: LifestyleLevel = "average";
const PREVIEW_SAVINGS_BALANCE = 18000;
const PREVIEW_TIMELINE: RelocationTimeline = "6months";

function formatUsd(amount: number) {
  return formatCurrency(amount);
}

export async function loadSampleAnalyzeResponse(): Promise<AnalyzeResponse> {
  const response = await fetch(SAMPLE_CSV_PATH);
  if (!response.ok) {
    throw new Error("Could not load sample transaction file.");
  }
  const text = await response.text();
  const file = new File([text], "sample-multi-month-transactions.csv", { type: "text/csv" });
  return analyzeFileInBrowser(file);
}

export function buildSampleCustomReportPayload(
  data: AnalyzeResponse,
  periodAnalysis: PeriodAnalysis,
  periodLabel: string,
  recommendations: CustomReportPayload["recommendations"] = []
): CustomReportPayload {
  const latestPeriod = data.periods[data.periods.length - 1];

  return {
    generatedAt: new Date().toLocaleString(),
    periodLabel,
    periodSelection: { mode: "single", period: latestPeriod },
    baseCity: PREVIEW_BASE_CITY,
    displayCurrency: "USD",
    data,
    periodAnalysis,
    recommendations,
    formatIncome: formatUsd,
    formatExpense: formatUsd,
  };
}

export async function buildSampleRelocationReportPayload(
  data: AnalyzeResponse
): Promise<ReportPayload> {
  const latestPeriod = data.periods[data.periods.length - 1];
  const periodRows = data.period_rows[latestPeriod] ?? [];
  const periodAnalysis = data.period_analysis[latestPeriod];
  if (!periodAnalysis) {
    throw new Error("Sample data is missing period analysis.");
  }

  const scenario: RelocationScenario = {
    incomeChangePct: PREVIEW_INCOME_CHANGE_PCT,
    lifestyle: PREVIEW_LIFESTYLE,
  };

  const cityResults = await compareMultipleCities(
    periodRows,
    [PREVIEW_BASE_CITY, ...PREVIEW_COMPARE_CITIES],
    PREVIEW_HOUSEHOLD_SIZE,
    latestPeriod
  );

  const relocationHealthContext = {
    baseHealthScore: healthScoreForPeriodSelection(
      data.period_rows,
      latestPeriod,
      data.periods
    ),
    expenseRows: periodRows,
    focusPeriod: latestPeriod,
  };

  const citySummaries = buildCitySummaries(
    periodAnalysis,
    cityResults,
    scenario,
    undefined,
    PREVIEW_BASE_CITY,
    cityResults.find((result) => result.reference_city === PREVIEW_BASE_CITY),
    relocationHealthContext
  );
  const recommendations = await recommendCitiesForSpending(
    periodRows,
    periodAnalysis,
    latestPeriod,
    PREVIEW_HOUSEHOLD_SIZE,
    scenario,
    [PREVIEW_BASE_CITY],
    3,
    PREVIEW_COMPARE_CITIES
  );

  const bestFitCity = recommendations[0]?.city ?? PREVIEW_COMPARE_CITIES[0];
  const bestFitSummary = citySummaries.find((entry) => entry.city === bestFitCity) ?? citySummaries[0];
  const bestFitResult =
    cityResults.find((result) => result.reference_city === bestFitCity) ?? cityResults[1] ?? null;
  const reportPrimaryResult = bestFitResult
    ? applyScenarioToLocationResult(bestFitResult, PREVIEW_LIFESTYLE)
    : null;
  const reportAffordability =
    bestFitSummary?.affordability ??
    (bestFitResult
      ? computeScenarioAffordability(
          periodAnalysis,
          bestFitResult,
          scenario,
          undefined,
          latestPeriod,
          cityResults.find((result) => result.reference_city === PREVIEW_BASE_CITY),
          relocationHealthContext
        )
      : null);

  let userBenchmarkSpending = getUserBenchmarkSpending(periodRows);
  if ((userBenchmarkSpending.rent ?? 0) === 0) {
    try {
      const rent = await fetchCityRentEstimate(
        PREVIEW_BASE_CITY,
        PREVIEW_HOUSEHOLD_SIZE,
        lifestyleMultiplier(PREVIEW_LIFESTYLE)
      );
      userBenchmarkSpending = { ...userBenchmarkSpending, rent };
    } catch {
      // Preview still works without rent estimate.
    }
  }

  const readiness = reportAffordability
    ? calculateCityRelocationReadiness(
        reportAffordability.scenarioIncomeDisplay,
        PREVIEW_SAVINGS_BALANCE,
        reportAffordability.displayReferenceCost,
        bestFitCity
      )
    : calculateCityRelocationReadiness(
        periodAnalysis.total_income,
        PREVIEW_SAVINGS_BALANCE,
        0,
        bestFitCity
      );

  const homeMonthlyCostDisplay =
    (await fetchCityMonthlyCost(PREVIEW_BASE_CITY, PREVIEW_HOUSEHOLD_SIZE)) *
    lifestyleMultiplier(PREVIEW_LIFESTYLE);

  const homeComparisonCostDisplay = totalBenchmarkCategorySpending(userBenchmarkSpending);

  const purchasingPowerEntries = homeComparisonCostDisplay
    ? buildPurchasingPowerIndexEntries(
        PREVIEW_BASE_CITY,
        homeComparisonCostDisplay,
        citySummaries.map((summary) => ({
          city: summary.city,
          monthlyCost: summary.affordability.displayReferenceCost,
        }))
      )
    : [];

  const compositeEntries =
    homeMonthlyCostDisplay && citySummaries.length
      ? buildCompositeScoreEntries({
          homeCity: PREVIEW_BASE_CITY,
          homeMonthlyCost: homeMonthlyCostDisplay,
          homeComparisonCost: homeComparisonCostDisplay,
          baseHealthScore: data.health_score,
          expenseRows: periodRows,
          incomeChangePct: PREVIEW_INCOME_CHANGE_PCT,
          toDisplayIncome: (amount) => amount,
          toDisplayExpense: (amount) => amount,
          savingsBalance: PREVIEW_SAVINGS_BALANCE,
          citySummaries,
        })
      : [];

  const scenarioIncome = periodAnalysis.total_income * (1 + PREVIEW_INCOME_CHANGE_PCT / 100);
  const financialHealthScore = adjustHealthScoreForScenarioIncome(
    data.health_score,
    scenarioIncome,
    periodAnalysis.total_expenses,
    periodRows,
    { focusPeriod: latestPeriod }
  ).overall;

  return {
    generatedAt: new Date().toLocaleString(),
    periodLabel: latestPeriod,
    baseCity: PREVIEW_BASE_CITY,
    primaryCity: PREVIEW_COMPARE_CITIES[0],
    bestFitCity,
    displayCurrency: "USD",
    householdSize: PREVIEW_HOUSEHOLD_SIZE,
    incomeChangePct: PREVIEW_INCOME_CHANGE_PCT,
    lifestyleLabel: "Average",
    lifestyleDescription: "Typical spending mix for the destination city.",
    timeline: PREVIEW_TIMELINE,
    data,
    affordability: reportAffordability,
    readiness,
    savingsBalance: PREVIEW_SAVINGS_BALANCE,
    citySummaries,
    recommendations: recommendations.map((entry) => ({
      city: entry.city,
      projectedBalance: entry.projectedBalance,
      verdictLabel: entry.verdictLabel,
    })),
    topRecommendations: recommendations.slice(0, 3).map((entry) => ({
      city: entry.city,
      score: entry.score,
      projectedBalance: entry.projectedBalance,
      referenceMonthlyCost: entry.referenceMonthlyCost,
      verdictLabel: entry.verdictLabel,
    })),
    primaryResult: reportPrimaryResult,
    userBenchmarkSpending,
    referenceCostNote: MONTHLY_BENCHMARK_NOTE,
    dataSource: reportPrimaryResult?.metadata?.source,
    dataSourceUpdated: reportPrimaryResult?.metadata?.updated,
    dataLicense: reportPrimaryResult?.metadata?.license,
    formatDisplay: formatUsd,
    formatExpense: formatUsd,
    formatReferenceCost: formatUsd,
    convertExpense: (amount) => amount,
    convertReferenceCost: (amount) => amount,
    purchasingPowerEntries,
    compositeEntries,
    homeMonthlyCostDisplay,
    financialHealthScore,
  };
}

export async function buildSampleReportPayloads() {
  const data = await loadSampleAnalyzeResponse();
  const latestPeriod = data.periods[data.periods.length - 1];
  const periodAnalysis = data.period_analysis[latestPeriod];
  if (!periodAnalysis) {
    throw new Error("Sample data is missing period analysis.");
  }

  const periodRows = data.period_rows[latestPeriod] ?? [];
  const scenario: RelocationScenario = {
    incomeChangePct: PREVIEW_INCOME_CHANGE_PCT,
    lifestyle: PREVIEW_LIFESTYLE,
  };

  const recommendations = await recommendCitiesForSpending(
    periodRows,
    periodAnalysis,
    latestPeriod,
    PREVIEW_HOUSEHOLD_SIZE,
    scenario,
    [PREVIEW_BASE_CITY],
    5,
    PREVIEW_COMPARE_CITIES
  ).then((entries) =>
    entries.map((entry) => ({
      city: entry.city,
      referenceMonthlyCost: entry.referenceMonthlyCost,
      projectedBalance: entry.projectedBalance,
      score: entry.score,
      verdictLabel: entry.verdictLabel,
    }))
  );

  const relocationPayload = await buildSampleRelocationReportPayload(data);

  const customPayload = {
    ...buildSampleCustomReportPayload(data, periodAnalysis, latestPeriod, recommendations),
    relocation: relocationPayload,
  };

  return { data, customPayload, relocationPayload, latestPeriod };
}
