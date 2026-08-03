import { CityAffordabilitySummary } from "@/lib/relocation-scenario";
import { adjustHealthScoreForScenarioIncome } from "@/lib/health-score";
import { HealthScore, Transaction } from "@/lib/types";
import { round2 } from "@/lib/utils";
export const RELOCATION_COMPOSITE_WEIGHTS = {
  costSavings: 0.4,
  purchasingPower: 0.35,
  runwayImprovement: 0.25,
} as const;

export const RELOCATION_COMPOSITE_FOOTNOTE =
  "A different traveler who values healthcare access or visa simplicity over pure cost would want those weights adjusted, or additional factors added, before treating this as a recommendation.";

export type PurchasingPowerIndexEntry = {
  city: string;
  cityShort: string;
  index: number;
  isHome: boolean;
};

export type CompositeScoreEntry = {
  city: string;
  cityShort: string;
  isHome: boolean;
  isBestFit: boolean;
  financialHealthScore: number;
  relocationLikelihoodScore: number;
  costVsHomePct: number;
  purchasingPowerIndex: number;
  savingsRunwayMonths: number | null;
  runwayGainMonths: number | null;
  costSavingsScore: number;
  purchasingPowerScore: number;
  runwayImprovementScore: number;
  rankReason?: string;
};

export function cityShortName(city: string) {
  return city.split(",")[0]?.trim() ?? city;
}

export function destinationFinancialHealthScore(
  baseHealthScore: HealthScore,
  expenseRows: Transaction[],
  scenarioIncome: number,
  scenarioExpenses: number,
  toDisplayExpense: (amount: number) => number
) {
  const nonEssentialTotal =
    baseHealthScore.metrics?.non_essential_total !== undefined
      ? toDisplayExpense(baseHealthScore.metrics.non_essential_total)
      : undefined;

  return adjustHealthScoreForScenarioIncome(
    baseHealthScore,
    scenarioIncome,
    scenarioExpenses,
    expenseRows,
    { nonEssentialTotal }
  ).overall;
}

export function purchasingPowerIndexValue(homeMonthlyCost: number, destMonthlyCost: number) {
  if (!homeMonthlyCost || !destMonthlyCost) return 100;
  return round2((homeMonthlyCost / destMonthlyCost) * 100);
}

function savingsRunwayMonths(savingsBalance: number | null, monthlyCost: number) {
  if (!savingsBalance || savingsBalance <= 0 || monthlyCost <= 0) return null;
  return round2(savingsBalance / monthlyCost);
}

function normalizeToBest(values: number[]) {
  const best = Math.max(...values, 1);
  return values.map((value) => round2((value / best) * 100));
}

export function buildPurchasingPowerIndexEntries(
  homeCity: string,
  homeMonthlyCost: number,
  destinations: { city: string; monthlyCost: number }[]
): PurchasingPowerIndexEntry[] {
  const homeEntry: PurchasingPowerIndexEntry = {
    city: homeCity,
    cityShort: cityShortName(homeCity),
    index: 100,
    isHome: true,
  };

  const destEntries = destinations.map((entry) => ({
    city: entry.city,
    cityShort: cityShortName(entry.city),
    index: purchasingPowerIndexValue(homeMonthlyCost, entry.monthlyCost),
    isHome: false,
  }));

  return [homeEntry, ...destEntries];
}

export function buildCompositeScoreEntries({
  homeCity,
  homeMonthlyCost,
  baseHealthScore,
  expenseRows,
  incomeChangePct,
  toDisplayExpense,
  savingsBalance,
  citySummaries,
}: {
  homeCity: string;
  homeMonthlyCost: number;
  baseHealthScore: HealthScore;
  expenseRows: Transaction[];
  incomeChangePct: number;
  toDisplayExpense: (amount: number) => number;
  savingsBalance: number | null;
  citySummaries: CityAffordabilitySummary[];
}): CompositeScoreEntry[] {
  if (!citySummaries.length || homeMonthlyCost <= 0) return [];

  const baseIncome = baseHealthScore.metrics?.total_income ?? 0;
  const baseExpenses = baseHealthScore.metrics?.total_expenses ?? 0;
  const incomeFactor = 1 + incomeChangePct / 100;
  const homeFinancialHealthScore = adjustHealthScoreForScenarioIncome(
    baseHealthScore,
    baseIncome * incomeFactor,
    baseExpenses,
    expenseRows
  ).overall;

  const normalizedHome = homeCity.trim().toLowerCase();
  const destinationSummaries = citySummaries.filter(
    (summary) => summary.city.trim().toLowerCase() !== normalizedHome
  );
  if (!destinationSummaries.length) return [];

  const homeRunway = savingsRunwayMonths(savingsBalance, homeMonthlyCost);

  const raw = destinationSummaries.map((summary) => {
    const destCost = round2(summary.affordability.displayReferenceCost);
    const costVsHomePct = round2(((homeMonthlyCost - destCost) / homeMonthlyCost) * 100);
    const ppIndex = purchasingPowerIndexValue(homeMonthlyCost, destCost);
    const destRunway = savingsRunwayMonths(savingsBalance, destCost);
    const runwayGain =
      homeRunway !== null && destRunway !== null ? round2(destRunway - homeRunway) : null;

    return {
      city: summary.city,
      cityShort: cityShortName(summary.city),
      isHome: false,
      isBestFit: false,
      financialHealthScore: summary.affordability.score,
      relocationLikelihoodScore: 0,
      costVsHomePct,
      purchasingPowerIndex: ppIndex,
      savingsRunwayMonths: destRunway,
      runwayGainMonths: runwayGain,
      costSavingsScore: 0,
      purchasingPowerScore: 0,
      runwayImprovementScore: 0,
      _costRaw: Math.max(0, costVsHomePct),
      _ppRaw: ppIndex,
      _runwayRaw: destRunway ?? 0,
    };
  });

  const costScores = normalizeToBest(raw.map((item) => item._costRaw));
  const ppScores = normalizeToBest(raw.map((item) => item._ppRaw));
  const runwayScores = normalizeToBest(raw.map((item) => item._runwayRaw));

  const scored = raw.map((item, index) => {
    const costSavingsScore = costScores[index];
    const purchasingPowerScore = ppScores[index];
    const runwayImprovementScore = runwayScores[index];
    const relocationLikelihoodScore = Math.round(
      costSavingsScore * RELOCATION_COMPOSITE_WEIGHTS.costSavings +
        purchasingPowerScore * RELOCATION_COMPOSITE_WEIGHTS.purchasingPower +
        runwayImprovementScore * RELOCATION_COMPOSITE_WEIGHTS.runwayImprovement
    );

    return {
      city: item.city,
      cityShort: item.cityShort,
      isHome: false,
      isBestFit: false,
      financialHealthScore: item.financialHealthScore,
      relocationLikelihoodScore,
      costVsHomePct: item.costVsHomePct,
      purchasingPowerIndex: item.purchasingPowerIndex,
      savingsRunwayMonths: item.savingsRunwayMonths,
      runwayGainMonths: item.runwayGainMonths,
      costSavingsScore,
      purchasingPowerScore,
      runwayImprovementScore,
    };
  });

  if (!scored.length) return [];

  const best = [...scored].sort(
    (a, b) => b.relocationLikelihoodScore - a.relocationLikelihoodScore
  )[0];
  const bestCity = best.city;

  const homeEntry: CompositeScoreEntry = {
    city: homeCity,
    cityShort: cityShortName(homeCity),
    isHome: true,
    isBestFit: false,
    financialHealthScore: homeFinancialHealthScore,
    relocationLikelihoodScore: 0,
    costVsHomePct: 0,
    purchasingPowerIndex: 100,
    savingsRunwayMonths: homeRunway,
    runwayGainMonths: null,
    costSavingsScore: 0,
    purchasingPowerScore: 100,
    runwayImprovementScore: homeRunway ?? 0,
  };

  const summariesByCity = new Map(
    destinationSummaries.map((summary) => [summary.city, summary])
  );

  return [
    homeEntry,
    ...scored.map((entry) => {
      const summary = summariesByCity.get(entry.city);
      const scenarioIncome = summary?.affordability.scenarioIncomeDisplay ?? 0;
      const scenarioExpenses = summary?.affordability.displayReferenceCost ?? 0;
      const financialHealthScore = destinationFinancialHealthScore(
        baseHealthScore,
        expenseRows,
        scenarioIncome,
        scenarioExpenses,
        toDisplayExpense
      );

      return {
        ...entry,
        financialHealthScore,
        isBestFit: entry.city === bestCity,
        rankReason:
          entry.city === bestCity
            ? `${cityShortName(entry.city)} scores highest mainly on cost delta and savings runway gain — the model weights cost savings 40%, purchasing power 35%, and savings runway improvement 25%.`
            : undefined,
      };
    }),
  ];
}

export function topPurchasingPowerExample(
  entries: PurchasingPowerIndexEntry[],
  homeCity: string
) {
  const homeShort = cityShortName(homeCity);
  const best = [...entries]
    .filter((entry) => !entry.isHome)
    .sort((a, b) => b.index - a.index)[0];
  if (!best) return null;
  const gainPct = round2(best.index - 100);
  return `An index of 100 means the paycheck buys exactly what it does today. In ${best.cityShort}, the same income behaves like ${Math.round(best.index)} — roughly ${gainPct}% more purchasing power for identical categories of spending than in ${homeShort}.`;
}
