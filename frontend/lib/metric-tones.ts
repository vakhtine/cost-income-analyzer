export type MetricTone = "positive" | "warning" | "negative" | "info";

export const CATEGORY_VOLATILITY_MEASURE = "coefficient of variation";

export function savingsRateTone(rate: number): MetricTone {
  if (rate >= 40) return "positive";
  if (rate >= 10) return "warning";
  return "negative";
}

export function netSavingsTone(amount: number): MetricTone {
  if (amount > 0) return "positive";
  if (amount < 0) return "negative";
  return "warning";
}

export function expenseToIncomeRatioTone(ratio: number): MetricTone {
  if (ratio <= 70) return "positive";
  if (ratio <= 90) return "warning";
  return "negative";
}

export function concentrationHhiTone(hhi: number): MetricTone {
  if (hhi < 0.25) return "positive";
  if (hhi < 0.4) return "warning";
  return "negative";
}

export function volatilityPctTone(value: number | null): MetricTone {
  if (value === null) return "info";
  if (value < 15) return "positive";
  if (value <= 30) return "warning";
  return "negative";
}

export function topCategoryShareTone(sharePct: number): MetricTone {
  if (sharePct < 30) return "positive";
  if (sharePct <= 50) return "warning";
  return "negative";
}

export function diversificationScoreTone(score: number): MetricTone {
  if (score >= 80) return "positive";
  if (score >= 50) return "warning";
  return "negative";
}

export function incomeSourceCountTone(count: number): MetricTone {
  if (count >= 3) return "positive";
  if (count >= 2) return "warning";
  if (count === 1) return "warning";
  return "negative";
}

export function metricToneToBand(tone: MetricTone): "excellent" | "good" | "bad" | "neutral" {
  if (tone === "positive") return "excellent";
  if (tone === "warning") return "good";
  if (tone === "negative") return "bad";
  return "neutral";
}

export function reportChangeToneClass(changePct: number) {
  if (Math.abs(changePct) >= 50) return "neg";
  return "";
}

export function reportVolatilityToneClass(volatilityPct: number, avgAmount: number) {
  if (volatilityPct > 50 && avgAmount >= 50) return "neg";
  return "";
}

export function categoryTrendChangeTone(
  currentTotal: number,
  priorTotal: number,
  changePct: number
): "" | "negative" {
  if (Math.abs(changePct) >= 50) return "negative";
  const dollarChange = Math.abs(currentTotal - priorTotal);
  const highDollar = dollarChange >= 50;
  const highPct = Math.abs(changePct) >= 5;
  if (highDollar && highPct && changePct > 0) {
    return "negative";
  }
  return "";
}

export function metricToneIcon(tone: MetricTone) {
  switch (tone) {
    case "positive":
      return "✓";
    case "warning":
      return "!";
    case "negative":
      return "✕";
    default:
      return "◆";
  }
}
