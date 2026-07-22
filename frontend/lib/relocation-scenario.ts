import { lifestyleMultiplier, LifestyleLevel } from "@/lib/wizard";
import {
  AffordabilityCurrencyContext,
  computeRelocationAffordability,
  RelocationAffordability,
} from "@/lib/relocation-affordability";
import { LocationCompareResult, PeriodAnalysis } from "@/lib/types";
import { round2 } from "@/lib/utils";

export type RelocationScenario = {
  incomeChangePct: number;
  lifestyle: LifestyleLevel;
};

function adjustComparisonStatus(userAmount: number, referenceAmount: number) {
  if (!referenceAmount) return "Near reference average";
  const difference = userAmount - referenceAmount;
  const difference_pct = (difference / referenceAmount) * 100;
  if (difference_pct > 15) return "Above reference average";
  if (difference_pct < -15) return "Below reference average";
  return "Near reference average";
}

export function applyScenarioToLocationResult(
  locationResult: LocationCompareResult,
  lifestyle: LifestyleLevel
): LocationCompareResult {
  const multiplier = lifestyleMultiplier(lifestyle);

  return {
    ...locationResult,
    reference_monthly_total: round2(locationResult.reference_monthly_total * multiplier),
    comparisons: locationResult.comparisons.map((row) => {
      const reference_amount = round2(row.reference_amount * multiplier);
      const difference = round2(row.user_amount - reference_amount);
      const difference_pct = reference_amount
        ? round2((difference / reference_amount) * 100)
        : 0;
      return {
        ...row,
        reference_amount,
        difference,
        difference_pct,
        status: adjustComparisonStatus(row.user_amount, reference_amount),
      };
    }),
  };
}

export function applyScenarioToPeriodAnalysis(
  periodAnalysis: PeriodAnalysis,
  incomeChangePct: number
): PeriodAnalysis {
  const incomeFactor = 1 + incomeChangePct / 100;
  const total_income = round2(periodAnalysis.total_income * incomeFactor);
  const net_savings = round2(total_income - periodAnalysis.total_expenses);
  const savings_rate = total_income ? round2((net_savings / total_income) * 100) : 0;

  return {
    ...periodAnalysis,
    total_income,
    net_savings,
    savings_rate,
    income_categories: periodAnalysis.income_categories.map((item) => ({
      ...item,
      total: round2(item.total * incomeFactor),
      pct_of_income: total_income
        ? round2(((item.total * incomeFactor) / total_income) * 100)
        : item.pct_of_income,
    })),
  };
}

export function computeScenarioAffordability(
  periodAnalysis: PeriodAnalysis,
  locationResult: LocationCompareResult,
  scenario: RelocationScenario,
  currency?: AffordabilityCurrencyContext
): RelocationAffordability {
  return computeRelocationAffordability(
    periodAnalysis,
    locationResult,
    currency,
    scenario
  );
}

export type CityAffordabilitySummary = {
  city: string;
  result: LocationCompareResult;
  affordability: RelocationAffordability;
};

export function buildCitySummaries(
  periodAnalysis: PeriodAnalysis,
  results: LocationCompareResult[],
  scenario: RelocationScenario,
  currency?: AffordabilityCurrencyContext
): CityAffordabilitySummary[] {
  return results.map((result) => ({
    city: result.reference_city,
    result,
    affordability: computeScenarioAffordability(
      periodAnalysis,
      result,
      scenario,
      currency
    ),
  }));
}
