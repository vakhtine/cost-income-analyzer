import {
  computeUserExpensesAtDestinationPrices,
  totalUploadedExpenseCategories,
  uploadedExpenseCategoryTotals,
} from "@/lib/benchmark-categories";
import {
  convertAmount,
  convertIncomeAmount,
  CurrencyCode,
  ExchangeRates,
} from "@/lib/currency";
import {
  computeRelocationFitBreakdown,
  RELOCATION_FIT_FACTOR_NOTES,
  resolveRelocationHealthContext,
} from "@/lib/relocation-fit-score";
import { HealthScore, LocationCompareResult, PeriodAnalysis, Transaction } from "@/lib/types";
import { round2 } from "@/lib/utils";
import { lifestyleMultiplier, LifestyleLevel } from "@/lib/wizard";

export const REFERENCE_COST_CURRENCY: CurrencyCode = "USD";

export type AffordabilityCurrencyContext = {
  incomeCurrency: CurrencyCode;
  expenseCurrency: CurrencyCode;
  displayCurrency: CurrencyCode;
  rates: ExchangeRates;
};

export type AffordabilityScenario = {
  incomeChangePct: number;
  lifestyle: LifestyleLevel;
};

export type AffordabilityVerdict = "comfortable" | "likely" | "tight" | "unlikely";

export type RelocationAffordability = {
  score: number;
  verdict: AffordabilityVerdict;
  verdictLabel: string;
  summary: string;
  userIncome: number;
  userExpenses: number;
  userSurplus: number;
  referenceMonthlyCost: number;
  projectedBalance: number;
  monthlyBuffer: number;
  tips: string[];
  displayCurrency: CurrencyCode;
  incomeCurrency: CurrencyCode;
  expenseCurrency: CurrencyCode;
  referenceCostCurrency: CurrencyCode;
  currentIncomeDisplay: number;
  scenarioIncomeDisplay: number;
  displayExpenses: number;
  displayReferenceCost: number;
  scenarioSurplus: number;
  /** Uploaded matrix-category spending scaled to destination prices. */
  displayCategoryAdjustedExpenses: number;
  /** Scenario income minus destination-adjusted category expenses. */
  adjustedScenarioSurplus: number;
  incomeChangePct: number;
  lifestyle: LifestyleLevel;
  scoreSummary: string;
  savingsRateScore: number;
  incomeStabilityScore: number;
  nonEssentialScore: number;
};

function comfortableSurplusFloor(displayCurrency: CurrencyCode) {
  switch (displayCurrency) {
    case "EUR":
      return 700;
    case "GBP":
      return 650;
    case "CAD":
      return 1000;
    case "AUD":
      return 1100;
    case "CHF":
      return 700;
    case "ALL":
      return 85000;
    case "RSD":
      return 90000;
    case "BAM":
    case "BGN":
      return 1400;
    case "MKD":
      return 45000;
    case "RON":
      return 3500;
    case "TRY":
      return 25000;
    default:
      return 800;
  }
}

/** @deprecated Use factor scores on RelocationAffordability or computeRelocationFitBreakdown. */
export function computeRelocationAffordabilityScores(aff: RelocationAffordability) {
  return {
    savingsRateScore: aff.savingsRateScore,
    incomeStabilityScore: aff.incomeStabilityScore,
    nonEssentialScore: aff.nonEssentialScore,
    heroScore: aff.score,
  };
}

export const RELOCATION_AFFORDABILITY_FACTOR_NOTES = RELOCATION_FIT_FACTOR_NOTES;

export const AT_HOME_BUDGET_SCORE_LABEL =
  "Relocation fit score - using your actual expenses";

export const AT_HOME_BUDGET_SCORE_NOTE =
  "Same what-if income and same three factors as the projected-expenses score (savings rate, income stability, non-essential control). Each expense category from your upload is scaled by that category's price level at the destination vs. your home city (local price data, not exchange rates).";

/** @deprecated Use AT_HOME_BUDGET_SCORE_LABEL */
export const CURRENT_BUDGET_MARGIN_SCORE_LABEL = AT_HOME_BUDGET_SCORE_LABEL;

function resolveVerdict(
  projectedBalance: number,
  scenarioIncomeDisplay: number,
  displayReferenceCost: number,
  displayCurrency: CurrencyCode
): {
  verdict: AffordabilityVerdict;
  verdictLabel: string;
} {
  if (projectedBalance < 0) {
    return { verdict: "unlikely", verdictLabel: "Likely unaffordable" };
  }

  const marginRatio =
    scenarioIncomeDisplay > 0 ? projectedBalance / scenarioIncomeDisplay : 0;
  const costCushion =
    displayReferenceCost > 0 ? projectedBalance / displayReferenceCost : 0;
  const comfortableFloor = comfortableSurplusFloor(displayCurrency);

  if (
    projectedBalance >= comfortableFloor ||
    marginRatio >= 0.3 ||
    costCushion >= 0.35
  ) {
    return { verdict: "comfortable", verdictLabel: "Comfortable" };
  }

  if (
    projectedBalance >= comfortableFloor * 0.35 ||
    marginRatio >= 0.12 ||
    costCushion >= 0.15
  ) {
    return { verdict: "likely", verdictLabel: "Likely affordable" };
  }

  return { verdict: "tight", verdictLabel: "Tight but possible" };
}

function destinationPricePhrase(destinationCity: string) {
  const parts = destinationCity.split(",").map((part) => part.trim()).filter(Boolean);
  if (parts.length >= 2) {
    const cityName = parts[0];
    const country = parts.slice(1).join(", ");
    return `at ${cityName}, using ${country} prices`;
  }
  return `at ${destinationCity} prices`;
}

function buildAffordabilityScoreSummary(
  scenarioSurplus: number,
  scenarioIncomeDisplay: number,
  displayCurrency: CurrencyCode,
  periodLabel: string,
  destinationCity: string
) {
  const expenseLabel = `your uploaded category spending ${destinationPricePhrase(destinationCity)}`;
  if (scenarioSurplus < 0) {
    return `Based on ${periodLabel}, your scenario income (${formatDisplayAmount(scenarioIncomeDisplay, displayCurrency, 2)} ${displayCurrency}) does not cover ${expenseLabel} — about ${formatDisplayAmount(Math.abs(scenarioSurplus), displayCurrency)} short each month.`;
  }
  return `Based on ${periodLabel}, your scenario income (${formatDisplayAmount(scenarioIncomeDisplay, displayCurrency, 2)} ${displayCurrency}) against ${expenseLabel} leaves about ${formatDisplayAmount(scenarioSurplus, displayCurrency)} per month.`;
}

function buildAffordabilitySummary(
  projectedBalance: number,
  scenarioIncomeDisplay: number,
  displayCurrency: CurrencyCode,
  periodLabel: string,
  city: string,
  verdict: AffordabilityVerdict
) {
  if (projectedBalance < 0) {
    return `Your scenario income may not comfortably cover average monthly costs in ${city}. You'd be short about ${formatDisplayAmount(Math.abs(projectedBalance), displayCurrency)} ${displayCurrency} per month.`;
  }
  if (verdict === "comfortable") {
    return `Based on ${periodLabel}, your scenario income (${formatDisplayAmount(scenarioIncomeDisplay, displayCurrency, 2)} ${displayCurrency}) should comfortably cover typical monthly costs in ${city}, with about ${formatDisplayAmount(projectedBalance, displayCurrency)} left over each month.`;
  }
  if (verdict === "likely") {
    return `Based on ${periodLabel}, your scenario income (${formatDisplayAmount(scenarioIncomeDisplay, displayCurrency, 2)} ${displayCurrency}) could cover typical monthly costs in ${city} with about ${formatDisplayAmount(projectedBalance, displayCurrency)} left over.`;
  }
  return `You may be able to move to ${city}, but your budget would be tight — projected monthly balance of ${formatDisplayAmount(projectedBalance, displayCurrency)} ${displayCurrency}.`;
}

function formatDisplayAmount(
  value: number,
  currency: CurrencyCode,
  maximumFractionDigits = 0
) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits:
      maximumFractionDigits ??
      (currency === "ALL" || currency === "RSD" || currency === "MKD" ? 0 : 2),
  }).format(value);
}

function toDisplayIncome(amount: number, currency?: AffordabilityCurrencyContext) {
  if (!currency) return amount;
  return convertIncomeAmount(
    amount,
    currency.incomeCurrency,
    currency.displayCurrency,
    currency.rates
  );
}

function toDisplayExpense(amount: number, currency?: AffordabilityCurrencyContext) {
  if (!currency) return amount;
  return convertAmount(
    amount,
    currency.expenseCurrency,
    currency.displayCurrency,
    currency.rates
  );
}

function toDisplayReferenceCost(amountUsd: number, currency?: AffordabilityCurrencyContext) {
  if (!currency) return amountUsd;
  return convertAmount(
    amountUsd,
    REFERENCE_COST_CURRENCY,
    currency.displayCurrency,
    currency.rates
  );
}

export function computeRelocationAffordability(
  periodAnalysis: PeriodAnalysis,
  locationResult: LocationCompareResult,
  currency?: AffordabilityCurrencyContext,
  scenario?: AffordabilityScenario,
  options?: {
    periodLabel?: string;
    homeLocationResult?: LocationCompareResult;
    baseHealthScore?: HealthScore;
    expenseRows?: Transaction[];
    focusPeriod?: string;
  }
): RelocationAffordability {
  const incomeChangePct = scenario?.incomeChangePct ?? 0;
  const lifestyle = scenario?.lifestyle ?? "average";
  const lifestyleMult = lifestyleMultiplier(lifestyle);

  const userIncome = periodAnalysis.total_income;
  const userExpenses = periodAnalysis.total_expenses;
  const userSurplus = periodAnalysis.net_savings;
  const referenceMonthlyCost = locationResult.reference_monthly_total;

  const displayCurrency = currency?.displayCurrency ?? "USD";
  const incomeCurrency = currency?.incomeCurrency ?? "USD";
  const expenseCurrency = currency?.expenseCurrency ?? "USD";

  const currentIncomeDisplay = round2(toDisplayIncome(userIncome, currency));
  const scenarioIncomeDisplay = round2(
    currentIncomeDisplay * (1 + incomeChangePct / 100)
  );
  const displayExpenses = round2(toDisplayExpense(userExpenses, currency));
  const displayReferenceCost = round2(
    toDisplayReferenceCost(referenceMonthlyCost, currency) * lifestyleMult
  );
  const scenarioSurplus = round2(scenarioIncomeDisplay - displayExpenses);

  const homeResult = options?.homeLocationResult;
  const userCategoryTotals = uploadedExpenseCategoryTotals(
    periodAnalysis.expense_categories
  );
  const isDestination =
    homeResult &&
    homeResult.reference_city.trim().toLowerCase() !==
      locationResult.reference_city.trim().toLowerCase();
  const rawCategoryAdjusted = isDestination
    ? computeUserExpensesAtDestinationPrices(
        locationResult,
        homeResult,
        userCategoryTotals,
        lifestyleMult
      ).total
    : totalUploadedExpenseCategories(userCategoryTotals);
  const displayCategoryAdjustedExpenses = round2(
    toDisplayExpense(rawCategoryAdjusted, currency)
  );
  const adjustedScenarioSurplus = round2(
    scenarioIncomeDisplay - displayCategoryAdjustedExpenses
  );

  const projectedBalance = round2(scenarioIncomeDisplay - displayReferenceCost);
  const monthlyBuffer = round2(
    scenarioIncomeDisplay - displayExpenses - (displayReferenceCost - displayExpenses)
  );

  const healthContext = resolveRelocationHealthContext({
    baseHealthScore: options?.baseHealthScore,
    expenseRows: options?.expenseRows,
    periodLabel: options?.periodLabel ?? locationResult.period_label,
    focusPeriod: options?.focusPeriod,
  });

  const homeUploadedCost = displayExpenses;
  const fitBreakdown = healthContext
    ? computeRelocationFitBreakdown(
        healthContext.baseHealthScore,
        healthContext.expenseRows,
        scenarioIncomeDisplay,
        displayCategoryAdjustedExpenses,
        (amount) => round2(toDisplayExpense(amount, currency)),
        homeUploadedCost
      )
    : {
        overall: 0,
        savingsRateScore: 0,
        incomeStabilityScore: 0,
        expenseStabilityScore: 0,
        nonEssentialScore: 0,
      };

  const score = fitBreakdown.overall;

  const { verdict, verdictLabel } = resolveVerdict(
    projectedBalance,
    scenarioIncomeDisplay,
    displayReferenceCost,
    displayCurrency
  );
  const city = locationResult.reference_city;

  const summary = buildAffordabilitySummary(
    projectedBalance,
    scenarioIncomeDisplay,
    displayCurrency,
    options?.periodLabel ?? locationResult.period_label,
    city,
    verdict
  );
  const scoreSummary = buildAffordabilityScoreSummary(
    adjustedScenarioSurplus,
    scenarioIncomeDisplay,
    displayCurrency,
    options?.periodLabel ?? locationResult.period_label,
    city
  );

  const tips: string[] = [];
  if (incomeChangePct !== 0) {
    const direction = incomeChangePct > 0 ? "higher" : "lower";
    tips.push(
      `What-if scenario: ${Math.abs(incomeChangePct)}% ${direction} income after moving (${incomeCurrency} → ${displayCurrency}, then ${incomeChangePct >= 0 ? "+" : ""}${incomeChangePct}%).`
    );
  } else {
    tips.push(
      `Income converted from ${incomeCurrency} to ${displayCurrency} at latest exchange rates (no income change in what-if scenario).`
    );
  }
  tips.push(
    `Actual-expenses score uses savings rate, income stability, and non-essential control — same factors as the projected-expenses score. Each uploaded category is repriced using destination vs. home price levels (not exchange rates).`
  );
  if (lifestyle !== "average") {
    const lifestyleLabel =
      lifestyle === "budget" ? "budget-conscious" : "comfortable";
    tips.push(
      `Projected-expenses score uses a ${lifestyleLabel} lifestyle multiplier (${lifestyleMult}x) on ${REFERENCE_COST_CURRENCY} benchmarks, shown in ${displayCurrency}.`
    );
  } else {
    tips.push(
      `Projected-expenses score uses ${REFERENCE_COST_CURRENCY} city benchmarks, converted to ${displayCurrency} for display only.`
    );
  }

  const aboveAverage = locationResult.comparisons.filter((row) =>
    row.status.includes("Above")
  );
  if (aboveAverage.length) {
    const categories = aboveAverage
      .slice(0, 3)
      .map((row) => row.category.toLowerCase())
      .join(", ");
    tips.push(
      `You spend more than locals on ${categories} — trimming these could improve affordability.`
    );
  }
  if (userSurplus <= 0) {
    tips.push("You're not saving money in your current month — build a surplus before relocating.");
  }
  if (verdict === "comfortable" || verdict === "likely") {
    if (monthlyBuffer > 0) {
      tips.push(
        `You have a lifestyle buffer of about ${formatDisplayAmount(monthlyBuffer, displayCurrency)} ${displayCurrency} compared to your current spending pattern.`
      );
    }
  }
  if (tips.length <= 2) {
    tips.push("Review category breakdown below to see where your spending differs from the reference city.");
  }

  return {
    score,
    verdict,
    verdictLabel,
    summary,
    userIncome: round2(userIncome),
    userExpenses: round2(userExpenses),
    userSurplus: round2(userSurplus),
    referenceMonthlyCost: round2(referenceMonthlyCost),
    projectedBalance,
    monthlyBuffer,
    tips,
    displayCurrency,
    incomeCurrency,
    expenseCurrency,
    referenceCostCurrency: REFERENCE_COST_CURRENCY,
    currentIncomeDisplay,
    scenarioIncomeDisplay,
    displayExpenses,
    displayReferenceCost,
    scenarioSurplus,
    displayCategoryAdjustedExpenses,
    adjustedScenarioSurplus,
    incomeChangePct,
    lifestyle,
    scoreSummary,
    savingsRateScore: fitBreakdown.savingsRateScore,
    incomeStabilityScore: fitBreakdown.incomeStabilityScore,
    nonEssentialScore: fitBreakdown.nonEssentialScore,
  };
}
