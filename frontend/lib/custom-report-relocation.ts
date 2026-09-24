import { recommendCitiesForSpending } from "@/lib/city-recommender";
import {
  compareMultipleCities,
  fetchCityMonthlyCost,
  fetchCityRentEstimate,
  getUserBenchmarkSpending,
  MONTHLY_BENCHMARK_NOTE,
} from "@/lib/city-data";
import { totalBenchmarkCategorySpending } from "@/lib/benchmark-categories";
import { ReportPayload } from "@/lib/export-relocation-report";
import { healthScoreForReportSelection } from "@/lib/rebuild";
import {
  buildCompositeScoreEntries,
  buildPurchasingPowerIndexEntries,
} from "@/lib/relocation-composite";
import {
  AffordabilityCurrencyContext,
  REFERENCE_COST_CURRENCY,
} from "@/lib/relocation-affordability";
import {
  calculateCityRelocationReadiness,
  loadRelocationProfile,
} from "@/lib/relocation-profile";
import {
  applyScenarioToLocationResult,
  buildCitySummaries,
  computeScenarioAffordability,
  RelocationScenario,
} from "@/lib/relocation-scenario";
import { LIFESTYLE_OPTIONS, lifestyleMultiplier, LifestyleLevel } from "@/lib/wizard";
import { AnalyzeResponse, PeriodAnalysis, PeriodReportSelection } from "@/lib/types";
import { convertAmount, CurrencyCode } from "@/lib/currency";
import { combinePeriodRowsInRange } from "@/lib/spending-metrics";
import { round2 } from "@/lib/utils";

export type CustomReportRelocationOptions = {
  data: AnalyzeResponse;
  periodSelection: PeriodReportSelection;
  periodLabel: string;
  periodAnalysis: PeriodAnalysis;
  baseCity: string;
  displayCurrency: CurrencyCode;
  currencyContext: AffordabilityCurrencyContext;
  formatIncome: (amount: number) => string;
  formatExpense: (amount: number) => string;
  convertIncome: (amount: number) => number;
  convertExpense: (amount: number) => number;
  convertReferenceCost: (amountUsd: number) => number;
  householdSize?: number;
  lifestyle?: LifestyleLevel;
  incomeChangePct?: number;
};

function periodRowsForSelection(data: AnalyzeResponse, selection: PeriodReportSelection) {
  if (selection.mode === "range") {
    return combinePeriodRowsInRange(
      data.period_rows,
      data.periods,
      selection.start,
      selection.end
    );
  }
  return data.period_rows[selection.period] ?? [];
}

export async function buildCustomReportRelocationPayload(
  options: CustomReportRelocationOptions
): Promise<ReportPayload> {
  const {
    data,
    periodSelection,
    periodLabel,
    periodAnalysis,
    baseCity,
    displayCurrency,
    currencyContext,
    formatIncome,
    formatExpense,
    convertIncome,
    convertExpense,
    convertReferenceCost,
    householdSize = 1,
    lifestyle = "average",
    incomeChangePct = 0,
  } = options;

  const periodRows = periodRowsForSelection(data, periodSelection);
  const baseHealthScore = healthScoreForReportSelection(
    data.period_rows,
    data.periods,
    periodSelection
  );
  const relocationHealthContext = {
    baseHealthScore,
    expenseRows: periodRows,
    focusPeriod: periodLabel,
  };
  const scenario: RelocationScenario = { incomeChangePct, lifestyle };
  const lifestyleOption = LIFESTYLE_OPTIONS.find((item) => item.id === lifestyle);
  const relocationProfile = loadRelocationProfile();

  const recommendations = await recommendCitiesForSpending(
    periodRows,
    periodAnalysis,
    periodLabel,
    householdSize,
    scenario,
    [baseCity],
    3,
    undefined,
    currencyContext
  );

  const compareCities = recommendations.slice(0, 3).map((entry) => entry.city);
  const citiesToCompare = [...new Set([baseCity, ...compareCities])];
  const cityResults = citiesToCompare.length
    ? await compareMultipleCities(periodRows, citiesToCompare, householdSize, periodLabel)
    : [];

  const homeCompareResult =
    cityResults.find((result) => result.reference_city === baseCity) ?? null;

  const citySummaries = buildCitySummaries(
    periodAnalysis,
    cityResults,
    scenario,
    currencyContext,
    baseCity,
    homeCompareResult ?? undefined,
    relocationHealthContext
  );

  const destinationSummaries = citySummaries.filter(
    (entry) => entry.city.trim().toLowerCase() !== baseCity.trim().toLowerCase()
  );

  const bestFitCity = recommendations[0]?.city ?? compareCities[0] ?? baseCity;
  const bestFitSummary = destinationSummaries.find((entry) => entry.city === bestFitCity);
  const bestFitResult =
    cityResults.find((result) => result.reference_city === bestFitCity) ?? null;
  const reportPrimaryResult = bestFitResult
    ? applyScenarioToLocationResult(bestFitResult, lifestyle)
    : null;
  const reportAffordability =
    bestFitSummary?.affordability ??
    (bestFitResult
      ? computeScenarioAffordability(
          periodAnalysis,
          bestFitResult,
          scenario,
          currencyContext,
          periodLabel,
          homeCompareResult ?? undefined,
          relocationHealthContext
        )
      : null);

  let userBenchmarkSpending = getUserBenchmarkSpending(periodRows);
  let rentIsEstimated = false;
  if ((userBenchmarkSpending.rent ?? 0) === 0) {
    try {
      const rent = await fetchCityRentEstimate(
        baseCity,
        householdSize,
        lifestyleMultiplier(lifestyle)
      );
      userBenchmarkSpending = { ...userBenchmarkSpending, rent };
      rentIsEstimated = true;
    } catch {
      // Continue without rent estimate.
    }
  }

  const readiness =
    reportAffordability
      ? calculateCityRelocationReadiness(
          reportAffordability.scenarioIncomeDisplay,
          relocationProfile.savingsBalance,
          reportAffordability.displayReferenceCost,
          bestFitCity
        )
      : calculateCityRelocationReadiness(
          convertIncome(periodAnalysis.total_income) * (1 + incomeChangePct / 100),
          relocationProfile.savingsBalance,
          0,
          bestFitCity
        );

  let homeMonthlyCostDisplay: number | null = null;
  try {
    const usdCost = await fetchCityMonthlyCost(baseCity, householdSize);
    homeMonthlyCostDisplay = convertAmount(
      usdCost * lifestyleMultiplier(lifestyle),
      REFERENCE_COST_CURRENCY,
      displayCurrency,
      currencyContext.rates
    );
  } catch {
    homeMonthlyCostDisplay = convertIncome(periodAnalysis.total_expenses);
  }

  const homeComparisonCostDisplay = round2(
    convertExpense(totalBenchmarkCategorySpending(userBenchmarkSpending))
  );

  const purchasingPowerEntries =
    homeComparisonCostDisplay && destinationSummaries.length
      ? buildPurchasingPowerIndexEntries(
          baseCity,
          homeComparisonCostDisplay,
          destinationSummaries.map((summary) => ({
            city: summary.city,
            monthlyCost: summary.affordability.displayReferenceCost,
          }))
        )
      : [];

  const compositeEntries =
    homeMonthlyCostDisplay && citySummaries.length
      ? buildCompositeScoreEntries({
          homeCity: baseCity,
          homeMonthlyCost: homeMonthlyCostDisplay,
          homeComparisonCost: homeComparisonCostDisplay,
          baseHealthScore,
          expenseRows: periodRows,
          incomeChangePct,
          toDisplayIncome: convertIncome,
          toDisplayExpense: convertExpense,
          savingsBalance: relocationProfile.savingsBalance,
          citySummaries,
        })
      : [];

  return {
    generatedAt: new Date().toLocaleString(),
    periodLabel,
    baseCity,
    primaryCity: compareCities[0] ?? bestFitCity,
    bestFitCity,
    displayCurrency,
    householdSize,
    incomeChangePct,
    lifestyleLabel: lifestyleOption?.label ?? lifestyle,
    lifestyleDescription: lifestyleOption?.description ?? "",
    timeline: relocationProfile.timeline,
    data,
    affordability: reportAffordability,
    readiness,
    savingsBalance: relocationProfile.savingsBalance,
    citySummaries: destinationSummaries,
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
    rentIsEstimated,
    referenceCostNote: MONTHLY_BENCHMARK_NOTE,
    dataSource: reportPrimaryResult?.metadata?.source,
    dataSourceUpdated: reportPrimaryResult?.metadata?.updated,
    dataLicense: reportPrimaryResult?.metadata?.license,
    formatDisplay: formatIncome,
    formatExpense,
    formatReferenceCost: (amount: number) => formatExpense(convertReferenceCost(amount)),
    convertExpense,
    convertReferenceCost,
    purchasingPowerEntries,
    compositeEntries,
    homeMonthlyCostDisplay,
  };
}
