import { Transaction } from "@/lib/types";

export function formatHealthReportPeriodLabel(
  focusLabel: string,
  periodsAnalyzed: number
): string {
  if (periodsAnalyzed <= 1) return focusLabel;

  const normalized = focusLabel.trim();
  if (normalized === "All periods" || normalized.toLowerCase().startsWith("average")) {
    return `${normalized} (${periodsAnalyzed} month${periodsAnalyzed === 1 ? "" : "s"})`;
  }

  if (/[–-]/.test(normalized)) {
    return `${normalized} (${periodsAnalyzed} month${periodsAnalyzed === 1 ? "" : "s"})`;
  }

  return `${normalized} (trailing ${periodsAnalyzed} month${periodsAnalyzed === 1 ? "" : "s"})`;
}

export function getPeriodExpenseDateLabel(
  _rows: Transaction[],
  periodLabel: string
): string {
  return `Period: ${periodLabel}`;
}

export function getReportPrivacyNotice(notice: string) {
  return `${notice} Estimates only — not financial advice.`;
}
