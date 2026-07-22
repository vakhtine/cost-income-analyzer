import {
  convertAmount,
  convertIncomeAmount,
  CurrencyCode,
  ExchangeRates,
} from "@/lib/currency";
import { LocationCompareResult, PeriodAnalysis } from "@/lib/types";
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
  incomeChangePct: number;
  lifestyle: LifestyleLevel;
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

function resolveVerdict(
  projectedBalance: number,
  score: number,
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
    costCushion >= 0.35 ||
    score >= 70
  ) {
    return { verdict: "comfortable", verdictLabel: "Comfortable" };
  }

  if (
    projectedBalance >= comfortableFloor * 0.35 ||
    marginRatio >= 0.12 ||
    costCushion >= 0.15 ||
    score >= 40
  ) {
    return { verdict: "likely", verdictLabel: "Likely affordable" };
  }

  return { verdict: "tight", verdictLabel: "Tight but possible" };
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
  scenario?: AffordabilityScenario
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
  const projectedBalance = round2(scenarioIncomeDisplay - displayReferenceCost);
  const monthlyBuffer = round2(
    scenarioIncomeDisplay - displayExpenses - (displayReferenceCost - displayExpenses)
  );

  let score = 0;
  if (scenarioIncomeDisplay > 0) {
    const balanceRatio = projectedBalance / scenarioIncomeDisplay;
    score = Math.round(Math.min(100, Math.max(0, balanceRatio * 100)));
  } else if (projectedBalance >= 0) {
    score = 55;
  } else {
    score = 25;
  }

  if (projectedBalance > 0 && displayReferenceCost > 0) {
    const surplusScore = Math.round(
      Math.min(100, (projectedBalance / (displayReferenceCost * 0.5)) * 45)
    );
    score = Math.max(score, surplusScore);
  }

  const { verdict, verdictLabel } = resolveVerdict(
    projectedBalance,
    score,
    scenarioIncomeDisplay,
    displayReferenceCost,
    displayCurrency
  );
  if (verdict === "comfortable") {
    score = Math.max(score, 78);
  } else if (verdict === "likely") {
    score = Math.max(score, 55);
  }
  const city = locationResult.reference_city;

  const summary = buildAffordabilitySummary(
    projectedBalance,
    scenarioIncomeDisplay,
    displayCurrency,
    locationResult.period_label,
    city,
    verdict
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
  if (lifestyle !== "average") {
    const lifestyleLabel =
      lifestyle === "budget" ? "budget-conscious" : "comfortable";
    tips.push(
      `Destination costs adjusted for a ${lifestyleLabel} lifestyle (${lifestyleMult}x on ${REFERENCE_COST_CURRENCY} benchmarks, shown in ${displayCurrency}).`
    );
  } else {
    tips.push(
      `Destination costs from ${REFERENCE_COST_CURRENCY} benchmarks, converted to ${displayCurrency}.`
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
    incomeChangePct,
    lifestyle,
  };
}
