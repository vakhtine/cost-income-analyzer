import { analyzeTransactions } from "@/lib/analyzer";
import { buildPeriodAdvice, detectCategorizationIssues } from "@/lib/advisor";
import { calculateHealthScore } from "@/lib/health-score";
import { parseUploadedFile, parseUploadedFiles } from "@/lib/parser";
import { comparePeriods } from "@/lib/period-analyzer";
import { AnalyzeResponse } from "@/lib/types";

function buildAnalyzeResponse(periods: AnalyzeResponse["period_rows"]): AnalyzeResponse {
  const periodNames = Object.keys(periods);
  const period_analysis: AnalyzeResponse["period_analysis"] = {};
  for (const name of periodNames) {
    period_analysis[name] = analyzeTransactions(periods[name]);
  }

  let comparison = null;
  if (periodNames.length >= 2) {
    const previous = periodNames[periodNames.length - 2];
    const current = periodNames[periodNames.length - 1];
    comparison = comparePeriods(periods[previous], periods[current], previous, current);
  }

  return {
    periods: periodNames,
    period_analysis,
    period_rows: periods,
    comparison,
    health_score: calculateHealthScore(periods),
    categorization_flags: detectCategorizationIssues(periods),
    advisor_notes: buildPeriodAdvice(periods, comparison),
    privacy_notice:
      "Your files were analyzed only in this browser session. Nothing was uploaded to a server.",
  };
}

export async function analyzeFilesInBrowser(files: File[]): Promise<AnalyzeResponse> {
  const periods = await parseUploadedFiles(files);
  return buildAnalyzeResponse(periods);
}

export async function analyzeFileInBrowser(file: File): Promise<AnalyzeResponse> {
  const periods = await parseUploadedFile(file);
  return buildAnalyzeResponse(periods);
}
