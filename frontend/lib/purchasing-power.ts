import { round2 } from "@/lib/utils";
import { convertAmount, CurrencyCode, ExchangeRates } from "@/lib/currency";

/**
 * Equivalent amount in the destination city for the same purchasing power,
 * assuming rent is paid in both cities. Uses monthly cost-of-living totals as indices.
 */
export function calculatePurchasingPowerEquivalent(
  amount: number,
  sourceMonthlyCost: number,
  destinationMonthlyCost: number
) {
  if (!sourceMonthlyCost || !destinationMonthlyCost || amount <= 0) return 0;
  return round2(amount * (destinationMonthlyCost / sourceMonthlyCost));
}

export function purchasingPowerRatio(
  sourceMonthlyCost: number,
  destinationMonthlyCost: number
) {
  if (!sourceMonthlyCost) return 0;
  return round2((destinationMonthlyCost / sourceMonthlyCost) * 100);
}

/** How many times further income goes in the source city vs the selected destination. */
export function purchasingPowerMultiplier(
  sourceMonthlyCost: number,
  destinationMonthlyCost: number
) {
  if (!destinationMonthlyCost) return 0;
  return round2(sourceMonthlyCost / destinationMonthlyCost);
}

/**
 * Headline multiplier shown in the UI.
 * Starts from the city cost-of-living ratio, then scales by how the display currency
 * relates to USD so stronger currencies (e.g. USD vs CAD) show a higher multiplier.
 */
export function displayPurchasingPowerMultiplier(
  amountUsd: number,
  equivalentUsd: number,
  displayCurrency: CurrencyCode,
  rates: ExchangeRates
) {
  if (!equivalentUsd) return 0;

  const cityRatio = amountUsd / equivalentUsd;
  const displayToUsd = convertAmount(1, displayCurrency, "USD", rates);

  return round2(cityRatio * displayToUsd);
}
