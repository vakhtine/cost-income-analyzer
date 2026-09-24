import { CityAffordabilitySummary } from "@/lib/relocation-scenario";
import { HEALTH_SCORE_WEIGHT_ITEMS } from "@/lib/health-score";
import { computeRelocationFitBreakdown } from "@/lib/relocation-fit-score";
import { HealthScore, Transaction } from "@/lib/types";
import { round2 } from "@/lib/utils";

export { HEALTH_SCORE_WEIGHT_ITEMS };

export const RELOCATION_COMPOSITE_FOOTNOTE =
  "A different traveler who values healthcare access or visa simplicity over pure cost would want those weights adjusted, or additional factors added, before treating this as a recommendation.";

export const HOME_ANALYZE_SCORE_NOTE_TITLE = "Why is this different from your Analyze score?";

export const HOME_FINANCIAL_HEALTH_COST_NOTE =
  "Uses projected living cost (WhereNext benchmark × lifestyle), not your full actual spending (e.g. mortgage).";

export const SCENARIO_ADJUSTED_HEALTH_SCORE_DATA_NOTE =
  "Income comes from your uploaded statement totals, adjusted by your what-if income change (and currency conversion when needed). Living costs use projected destination averages (WhereNext benchmarks × lifestyle tier), not actual spending from your upload.";

export const SCENARIO_ADJUSTED_HEALTH_SCORE_LABEL =
  "Scenario-adjusted financial health score";

export const RELOCATION_OVERVIEW_SUBTITLE =
  "Same what-if income — actual uploaded expenses vs. projected destination costs.";

export const RELOCATION_FIT_SCORE_LABEL =
  "Relocation fit score - using projected expenses";

export const DESTINATION_FIT_SCORE_NOTE =
  "Same what-if income as the actual-expenses score, with projected living costs for each destination (WhereNext benchmarks × lifestyle tier).";

export const RELOCATION_SCORES_COMPARISON_NOTE =
  "Both scores use the same income and the same three factors — savings rate, income stability, and non-essential control. Relocation fit score - using your actual expenses reprices each uploaded expense category by that category's local price level at the destination vs. home (not exchange rates); relocation fit score - using projected expenses uses benchmark totals for each city.";

export const RELOCATION_FIT_CONTEXT_ITEMS = [
  {
    label: "Cost vs. home",
    description:
      "How the destination projected total in the category table compares to your spending row total (same categories).",
  },
  {
    label: "Purchasing power",
    description: "How far the same income goes in the destination (home = 100).",
  },
  {
    label: "Savings runway",
    description: "Months your savings balance would cover destination living costs.",
  },
] as const;

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
  savingsRateScore: number;
  incomeStabilityScore: number;
  expenseStabilityScore: number;
  nonEssentialScore: number;
  rankReason?: string;
};

export function cityShortName(city: string) {
  return city.split(",")[0]?.trim() ?? city;
}

/** Four-factor health score using projected living cost — comparable across home and destinations. */
export function destinationFinancialHealthScore(
  baseHealthScore: HealthScore,
  expenseRows: Transaction[],
  scenarioIncome: number,
  scenarioExpenses: number,
  toDisplayExpense: (amount: number) => number,
  homeMonthlyCost: number
) {
  return computeRelocationFitBreakdown(
    baseHealthScore,
    expenseRows,
    scenarioIncome,
    scenarioExpenses,
    toDisplayExpense,
    homeMonthlyCost
  ).overall;
}

/** Same model as destination — home uses projected living cost for apples-to-apples comparison. */
export function homeFinancialHealthScore(
  baseHealthScore: HealthScore,
  expenseRows: Transaction[],
  scenarioIncome: number,
  scenarioExpenses: number,
  toDisplayExpense: (amount: number) => number
) {
  return computeRelocationFitBreakdown(
    baseHealthScore,
    expenseRows,
    scenarioIncome,
    scenarioExpenses,
    toDisplayExpense,
    scenarioExpenses
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
  homeComparisonCost,
  baseHealthScore,
  expenseRows,
  incomeChangePct,
  toDisplayIncome,
  toDisplayExpense,
  savingsBalance,
  citySummaries,
}: {
  homeCity: string;
  homeMonthlyCost: number;
  /** Category-table home baseline for cost vs. home and purchasing power (defaults to homeMonthlyCost). */
  homeComparisonCost?: number;
  baseHealthScore: HealthScore;
  expenseRows: Transaction[];
  incomeChangePct: number;
  toDisplayIncome: (amount: number) => number;
  toDisplayExpense: (amount: number) => number;
  savingsBalance: number | null;
  citySummaries: CityAffordabilitySummary[];
}): CompositeScoreEntry[] {
  if (!citySummaries.length || homeMonthlyCost <= 0) return [];

  const compareHomeCost =
    homeComparisonCost !== undefined && homeComparisonCost > 0
      ? homeComparisonCost
      : homeMonthlyCost;

  const baseIncome = baseHealthScore.metrics?.total_income ?? 0;
  const incomeFactor = 1 + incomeChangePct / 100;
  const scenarioIncome = round2(toDisplayIncome(baseIncome * incomeFactor));
  const homeBreakdown = computeRelocationFitBreakdown(
    baseHealthScore,
    expenseRows,
    scenarioIncome,
    round2(homeMonthlyCost),
    toDisplayExpense,
    homeMonthlyCost
  );

  const normalizedHome = homeCity.trim().toLowerCase();
  const destinationSummaries = citySummaries.filter(
    (summary) => summary.city.trim().toLowerCase() !== normalizedHome
  );
  if (!destinationSummaries.length) return [];

  const homeRunway = savingsRunwayMonths(savingsBalance, homeMonthlyCost);

  const destinationEntries: CompositeScoreEntry[] = destinationSummaries.map((summary) => {
    const destCost = round2(summary.affordability.displayReferenceCost);
    const costVsHomePct = round2(((compareHomeCost - destCost) / compareHomeCost) * 100);
    const ppIndex = purchasingPowerIndexValue(compareHomeCost, destCost);
    const destRunway = savingsRunwayMonths(savingsBalance, destCost);
    const runwayGain =
      homeRunway !== null && destRunway !== null ? round2(destRunway - homeRunway) : null;
    const breakdown = computeRelocationFitBreakdown(
      baseHealthScore,
      expenseRows,
      round2(summary.affordability.scenarioIncomeDisplay),
      destCost,
      toDisplayExpense,
      homeMonthlyCost
    );

    return {
      city: summary.city,
      cityShort: cityShortName(summary.city),
      isHome: false,
      isBestFit: false,
      financialHealthScore: breakdown.overall,
      relocationLikelihoodScore: breakdown.overall,
      costVsHomePct,
      purchasingPowerIndex: ppIndex,
      savingsRunwayMonths: destRunway,
      runwayGainMonths: runwayGain,
      savingsRateScore: breakdown.savingsRateScore,
      incomeStabilityScore: breakdown.incomeStabilityScore,
      expenseStabilityScore: breakdown.expenseStabilityScore,
      nonEssentialScore: breakdown.nonEssentialScore,
    };
  });

  const best = [...destinationEntries].sort(
    (a, b) => b.relocationLikelihoodScore - a.relocationLikelihoodScore
  )[0];
  const bestCity = best.city;

  const homeEntry: CompositeScoreEntry = {
    city: homeCity,
    cityShort: cityShortName(homeCity),
    isHome: true,
    isBestFit: false,
    financialHealthScore: homeBreakdown.overall,
    relocationLikelihoodScore: 0,
    costVsHomePct: 0,
    purchasingPowerIndex: 100,
    savingsRunwayMonths: homeRunway,
    runwayGainMonths: null,
    savingsRateScore: homeBreakdown.savingsRateScore,
    incomeStabilityScore: homeBreakdown.incomeStabilityScore,
    expenseStabilityScore: homeBreakdown.expenseStabilityScore,
    nonEssentialScore: homeBreakdown.nonEssentialScore,
  };

  return [
    homeEntry,
    ...destinationEntries.map((entry) => ({
      ...entry,
      isBestFit: entry.city === bestCity,
      rankReason:
        entry.city === bestCity
          ? `${cityShortName(entry.city)} is the best fit among compared destinations — compare cost vs. home, purchasing power, and savings runway on the card below.`
          : undefined,
    })),
  ];
}

export function topPurchasingPowerExample(
  entries: PurchasingPowerIndexEntry[],
  homeCity: string
) {
  const best = [...entries]
    .filter((entry) => !entry.isHome)
    .sort((a, b) => b.index - a.index)[0];
  if (!best) return null;
  const displayIndex = Math.round(best.index);
  const gainPct = round2(displayIndex - 100);
  return `An index of 100 matches your current category spending total. In ${best.cityShort}, projected costs index at ${displayIndex} — about ${Math.abs(gainPct)}% ${gainPct >= 0 ? "lower" : "higher"} than your spending row for the same categories.`;
}
