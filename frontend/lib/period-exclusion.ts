import { rebuildAnalyzeResponse } from "@/lib/rebuild";
import { AnalyzeResponse } from "@/lib/types";

export function applyExcludedPeriods(
  data: AnalyzeResponse,
  excludedPeriods: string[]
): AnalyzeResponse {
  if (!excludedPeriods.length) return data;

  const excluded = new Set(excludedPeriods);
  const periods = data.periods.filter((period) => !excluded.has(period));
  if (periods.length === data.periods.length) return data;
  if (!periods.length) return data;

  const period_rows = Object.fromEntries(
    periods.map((period) => [period, data.period_rows[period] ?? []])
  );

  return rebuildAnalyzeResponse(period_rows, periods);
}
