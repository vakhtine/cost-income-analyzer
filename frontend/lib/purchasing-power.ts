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
 * Headline multiplier: how many times further income goes in the source city vs destination.
 * This is a cost-of-living ratio and is the same in any display currency — currency strength
 * does not change the relative purchasing power between two cities.
 */
export function displayPurchasingPowerMultiplier(
  amountUsd: number,
  equivalentUsd: number,
  displayCurrency: CurrencyCode,
  rates: ExchangeRates
) {
  if (!equivalentUsd) return 0;

  const amountDisplay = convertAmount(amountUsd, "USD", displayCurrency, rates);
  const equivalentDisplay = convertAmount(equivalentUsd, "USD", displayCurrency, rates);
  if (!equivalentDisplay) return 0;

  return round2(amountDisplay / equivalentDisplay);
}
