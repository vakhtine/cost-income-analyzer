import {
  adjustHealthScoreForScenarioIncome,
  calculateHealthScoreForPeriod,
  roundHealthScore,
} from "@/lib/health-score";
import { HealthScore, Transaction } from "@/lib/types";
import { round2 } from "@/lib/utils";

export type RelocationFitBreakdown = {
  overall: number;
  savingsRateScore: number;
  incomeStabilityScore: number;
  expenseStabilityScore: number;
  nonEssentialScore: number;
};

export const RELOCATION_FIT_FACTOR_NOTES = {
  savingsRate:
    "Scenario income minus living costs for this city, as a share of income (continuous savings-rate scale).",
  incomeStability: "Income volatility from your uploaded statement periods.",
  nonEssentialControl:
    "Discretionary spending relative to scenario income, scaled when destination costs differ from home.",
} as const;

export function computeRelocationFitBreakdown(
  baseHealthScore: HealthScore,
  expenseRows: Transaction[],
  scenarioIncome: number,
  scenarioExpenses: number,
  toDisplayExpense: (amount: number) => number,
  homeMonthlyCost: number
): RelocationFitBreakdown {
  let nonEssentialTotal =
    baseHealthScore.metrics?.non_essential_total !== undefined
      ? toDisplayExpense(baseHealthScore.metrics.non_essential_total)
      : undefined;

  if (
    nonEssentialTotal !== undefined &&
    homeMonthlyCost > 0 &&
    scenarioExpenses > 0
  ) {
    nonEssentialTotal = round2(
      (scenarioExpenses / homeMonthlyCost) * nonEssentialTotal
    );
  }

  const adjusted = adjustHealthScoreForScenarioIncome(
    baseHealthScore,
    scenarioIncome,
    scenarioExpenses,
    expenseRows,
    {
      nonEssentialTotal,
      continuousSavingsRate: true,
    }
  );

  return {
    overall: roundHealthScore(adjusted.overall),
    savingsRateScore: adjusted.savings_rate_score,
    incomeStabilityScore: adjusted.income_stability_score,
    expenseStabilityScore: adjusted.expense_stability_score,
    nonEssentialScore: adjusted.non_essential_score,
  };
}

export function resolveRelocationHealthContext(options: {
  baseHealthScore?: HealthScore;
  expenseRows?: Transaction[];
  periodLabel?: string;
  focusPeriod?: string;
}): { baseHealthScore: HealthScore; expenseRows: Transaction[] } | null {
  if (options.baseHealthScore && options.expenseRows?.length) {
    return {
      baseHealthScore: options.baseHealthScore,
      expenseRows: options.expenseRows,
    };
  }

  if (options.expenseRows?.length && options.periodLabel) {
    const focus = options.focusPeriod ?? options.periodLabel;
    const periods = { [focus]: options.expenseRows };
    return {
      baseHealthScore: calculateHealthScoreForPeriod(periods, focus, [focus]),
      expenseRows: options.expenseRows,
    };
  }

  return null;
}
