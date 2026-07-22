import { PeriodAnalysis } from "@/lib/types";
import { round2 } from "@/lib/utils";

export type RelocationTimeline = "exploring" | "3months" | "6months";

export type RelocationProfile = {
  savingsBalance: number | null;
  timeline: RelocationTimeline | null;
  targetCity: string | null;
};

const STORAGE_KEY = "relocation-profile";

export const DEFAULT_RELOCATION_PROFILE: RelocationProfile = {
  savingsBalance: null,
  timeline: null,
  targetCity: null,
};

export function loadRelocationProfile(): RelocationProfile {
  if (typeof window === "undefined") return DEFAULT_RELOCATION_PROFILE;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_RELOCATION_PROFILE;
    const parsed = JSON.parse(raw) as RelocationProfile;
    return {
      savingsBalance:
        typeof parsed.savingsBalance === "number" ? parsed.savingsBalance : null,
      timeline: parsed.timeline ?? null,
      targetCity: typeof parsed.targetCity === "string" ? parsed.targetCity : null,
    };
  } catch {
    return DEFAULT_RELOCATION_PROFILE;
  }
}

export function saveRelocationProfile(profile: RelocationProfile) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
}

export type RelocationReadiness = {
  runwayMonths: number | null;
  runwayLabel: string;
  moveReadinessPct: number;
  moveReadinessLabel: string;
  incomeCoveragePct: number;
  incomeCoverageLabel: string;
};

export function calculateRelocationReadiness(
  analysis: PeriodAnalysis,
  savingsBalance: number | null
): RelocationReadiness {
  const { total_income, total_expenses, net_savings } = analysis;

  let runwayMonths: number | null = null;
  let runwayLabel = "Add optional savings to estimate your runway.";
  if (savingsBalance && savingsBalance > 0 && total_expenses > 0) {
    runwayMonths = round2(savingsBalance / total_expenses);
    runwayLabel = `About ${runwayMonths.toFixed(1)} months of expenses covered by savings.`;
  }

  const moveReadinessPct =
    total_expenses > 0 ? round2((net_savings / total_expenses) * 100) : 0;
  let moveReadinessLabel = "Not enough data to estimate move readiness.";
  if (total_expenses > 0) {
    if (moveReadinessPct >= 15) {
      moveReadinessLabel = `You could absorb roughly a ${moveReadinessPct.toFixed(0)}% cost increase and still break even.`;
    } else if (moveReadinessPct >= 0) {
      moveReadinessLabel = `Your surplus is thin — only about ${moveReadinessPct.toFixed(0)}% of monthly expenses.`;
    } else {
      moveReadinessLabel = `You're spending above income; build a surplus before relocating.`;
    }
  }

  const incomeCoveragePct =
    total_income > 0 ? round2((total_expenses / total_income) * 100) : 0;
  const incomeCoverageLabel =
    total_income > 0
      ? `Expenses use ${incomeCoveragePct.toFixed(0)}% of income — ${round2(100 - incomeCoveragePct)}% remains after bills.`
      : "No income categories detected in this period.";

  return {
    runwayMonths,
    runwayLabel,
    moveReadinessPct,
    moveReadinessLabel,
    incomeCoveragePct,
    incomeCoverageLabel,
  };
}

function cityShortLabel(city: string) {
  return city.split(",")[0]?.trim() || city;
}

export function calculateCityRelocationReadiness(
  incomeDisplay: number,
  savingsBalance: number | null,
  destinationCostDisplay: number,
  destinationCity: string
): RelocationReadiness {
  const cityLabel = cityShortLabel(destinationCity);
  const hasCityCost = destinationCostDisplay > 0;
  const hasIncome = incomeDisplay > 0;

  let runwayMonths: number | null = null;
  let runwayLabel = "Add savings and select a city to estimate runway.";
  if (savingsBalance && savingsBalance > 0 && hasCityCost) {
    runwayMonths = round2(savingsBalance / destinationCostDisplay);
    runwayLabel = `About ${runwayMonths.toFixed(1)} months of ${cityLabel} living costs covered by savings.`;
  } else if (hasCityCost && (!savingsBalance || savingsBalance <= 0)) {
    runwayLabel = `Enter savings to see how many months of ${cityLabel} costs you could cover.`;
  } else if (!hasCityCost) {
    runwayLabel = "Select a city to load estimated monthly living costs.";
  }

  const projectedBalance = hasCityCost ? incomeDisplay - destinationCostDisplay : 0;
  const moveReadinessPct = hasCityCost
    ? round2((projectedBalance / destinationCostDisplay) * 100)
    : 0;

  let moveReadinessLabel = "Select a city to estimate move readiness.";
  if (hasCityCost && hasIncome) {
    if (moveReadinessPct >= 15) {
      moveReadinessLabel = `At current income, you could absorb roughly a ${moveReadinessPct.toFixed(0)}% cost increase in ${cityLabel} and still break even.`;
    } else if (moveReadinessPct >= 0) {
      moveReadinessLabel = `Surplus is thin for ${cityLabel} — only about ${moveReadinessPct.toFixed(0)}% of that city's monthly costs.`;
    } else {
      moveReadinessLabel = `Estimated ${cityLabel} costs exceed your income — build a surplus or adjust income before relocating.`;
    }
  } else if (hasCityCost && !hasIncome) {
    moveReadinessLabel = `Estimated ${cityLabel} cost is ${destinationCostDisplay.toFixed(0)}/mo — add income data to compare.`;
  }

  const incomeCoveragePct = hasIncome
    ? round2((destinationCostDisplay / incomeDisplay) * 100)
    : 0;
  const incomeCoverageLabel = hasIncome
    ? hasCityCost
      ? `Living in ${cityLabel} would use ${incomeCoveragePct.toFixed(0)}% of income — ${round2(Math.max(0, 100 - incomeCoveragePct))}% remains after estimated costs.`
      : "Select a city to compare costs against your income."
    : "No income categories detected in this period.";

  return {
    runwayMonths,
    runwayLabel,
    moveReadinessPct,
    moveReadinessLabel,
    incomeCoveragePct,
    incomeCoverageLabel,
  };
}
