export type MetricTone = "positive" | "warning" | "negative" | "info";

export const CATEGORY_VOLATILITY_MEASURE = "coefficient of variation";

export function discretionarySpendingTone(pctOfExpenses: number): MetricTone {
  if (pctOfExpenses <= 20) return "positive";
  if (pctOfExpenses <= 35) return "warning";
  return "negative";
}

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

export function hhiConcentrationLabel(hhi: number): string {
  if (hhi < 0.25) return "Well diversified";
  if (hhi < 0.4) return "Moderate concentration";
  return "High concentration";
}

export function volatilityPctLabel(value: number | null): string {
  if (value === null) return "Not enough periods";
  if (value < 15) return "Low volatility";
  if (value <= 30) return "Moderate volatility";
  return "High volatility";
}

export function incomeVolatilityPctLabel(value: number | null): string {
  return volatilityPctLabel(value);
}

export function topCategoryShareLabel(sharePct: number): string {
  if (sharePct < 30) return "Well spread";
  if (sharePct <= 50) return "Moderate concentration";
  return "Heavy single category";
}

export function expenseToIncomeRatioLabel(ratio: number): string {
  if (ratio <= 70) return "Comfortable ratio";
  if (ratio <= 90) return "Tight ratio";
  return "Overstretched";
}

export function stabilityScoreLabel(score: number): string {
  if (score >= 80) return "Strong stability";
  if (score >= 60) return "Moderate stability";
  return "Unstable";
}

export function nonEssentialShareLabel(pctOfExpenses: number): string {
  if (pctOfExpenses <= 20) return "Low discretionary share";
  if (pctOfExpenses <= 35) return "Moderate discretionary share";
  return "High discretionary share";
}

export function moveReadinessQualitativeLabel(pct: number): string {
  if (pct >= 100) return "Strong surplus";
  if (pct >= 50) return "Good margin";
  if (pct >= 15) return "Moderate margin";
  if (pct >= 0) return "Thin margin";
  return "Deficit";
}

export function nonEssentialControlLabel(score: number): string {
  if (score >= 80) return "Strong control";
  if (score >= 60) return "Good control";
  if (score >= 40) return "Moderate control";
  return "Needs improvement";
}

/** Daily spend relative to daily income (same ratio as expense / income). */
export function avgDailySpendLabel(expenseToIncomeRatio: number): string {
  if (expenseToIncomeRatio <= 0) return "No income recorded";
  if (expenseToIncomeRatio <= 70) return "Low";
  if (expenseToIncomeRatio <= 90) return "Typical";
  return "High";
}

export function essentialExpensePctLabel(pct: number): string {
  if (pct >= 95) return "Very high";
  if (pct >= 85) return "High";
  if (pct >= 70) return "Moderate";
  return "Lower share";
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

export function expenseCategoryCountTone(count: number): MetricTone {
  if (count >= 8) return "positive";
  if (count >= 5) return "warning";
  if (count >= 3) return "warning";
  return "negative";
}

export function metricToneToBand(tone: MetricTone): "excellent" | "good" | "bad" | "neutral" {
  if (tone === "positive") return "excellent";
  if (tone === "warning") return "good";
  if (tone === "negative") return "bad";
  return "neutral";
}

export function reportChangeToneClass(changePct: number) {
  if (changePct < -5) return "pos";
  if (changePct > 5) return "neg";
  return "";
}

export function reportVolatilityToneClass(volatilityPct: number, avgAmount: number) {
  if (volatilityPct > 50 && avgAmount >= 50) return "neg";
  return "";
}

export function categoryTrendChangeTone(
  currentTotal: number,
  priorTotal: number,
  changePct: number | null
): "" | "positive" | "negative" | "new" {
  if (priorTotal === 0 && currentTotal > 0) return "new";
  if (changePct === null) return "";
  if (Math.abs(changePct) < 5) return "";
  if (changePct < 0) return "positive";
  if (changePct > 0) return "negative";
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
