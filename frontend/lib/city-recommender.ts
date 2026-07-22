import { compareMultipleCities } from "@/lib/city-data";
import { CityCostProfile, fetchCityCostProfiles } from "@/lib/city-cost-items";
import { ALL_REFERENCE_CITIES } from "@/lib/constants";
import { AffordabilityCurrencyContext } from "@/lib/relocation-affordability";
import { buildCitySummaries, RelocationScenario } from "@/lib/relocation-scenario";
import { PeriodAnalysis, Transaction } from "@/lib/types";

export type CityRecommendation = {
  city: string;
  score: number;
  projectedBalance: number;
  referenceMonthlyCost: number;
  verdictLabel: string;
  costProfile?: CityCostProfile;
};

export async function recommendCitiesForSpending(
  rows: Transaction[],
  periodAnalysis: PeriodAnalysis,
  periodLabel: string,
  householdSize: number,
  scenario: RelocationScenario,
  excludeCities: string[] = [],
  limit = 5,
  candidateCities?: string[],
  currency?: AffordabilityCurrencyContext
): Promise<CityRecommendation[]> {  const cityPool =
    candidateCities?.filter(Boolean).length
      ? [...new Set(candidateCities.filter(Boolean))]
      : ALL_REFERENCE_CITIES;
  const cities = cityPool.filter((city) => !excludeCities.includes(city));
  if (!cities.length) {
    throw new Error("No cities available to rank. Select at least one destination city.");
  }
  const results = await compareMultipleCities(rows, cities, householdSize, periodLabel);
  const summaries = buildCitySummaries(periodAnalysis, results, scenario, currency);

  const recommendations = summaries
    .map((entry) => ({
      city: entry.city,
      score: entry.affordability.score,
      projectedBalance: entry.affordability.projectedBalance,
      referenceMonthlyCost: entry.affordability.displayReferenceCost,
      verdictLabel: entry.affordability.verdictLabel,
    }))
    .sort((a, b) => {
      const balanceDiff = b.projectedBalance - a.projectedBalance;
      if (balanceDiff !== 0) return balanceDiff;
      return a.referenceMonthlyCost - b.referenceMonthlyCost;
    })
    .slice(0, limit);

  const costProfiles = await fetchCityCostProfiles(recommendations.map((entry) => entry.city));

  return recommendations.map((entry) => ({
    ...entry,
    costProfile: costProfiles[entry.city],
  }));
}