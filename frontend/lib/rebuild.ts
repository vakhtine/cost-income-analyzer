import { analyzeTransactions } from "@/lib/analyzer";
import { buildPeriodAdvice, detectCategorizationIssues } from "@/lib/advisor";
import {
  calculateHealthScore,
  calculateHealthScoreForPeriod,
  healthSummary,
} from "@/lib/health-score";
import { comparePeriods } from "@/lib/period-analyzer";
import {
  consolidateRowsIntoUploadPeriods,
  deriveUploadPeriods,
  filterReportablePeriodOrder,
  orderedPeriodKeys,
} from "@/lib/period-utils";
import {
  combinePeriodRowsInRange,
  periodRangeLabel,
  slicePeriodOrder,
} from "@/lib/spending-metrics";
import {
  normalizePeriodRows,
  periodHasReportableData,
} from "@/lib/transaction-filters";
import { AnalyzeResponse, PeriodAnalysis, PeriodReportSelection, Transaction } from "@/lib/types";

export const AVERAGE_PERIOD_LABEL = "__average__";

export function analyzeAveragePeriods(period_rows: Record<string, Transaction[]>) {
  const names = Object.keys(period_rows);
  if (names.length <= 1) {
    return analyzeTransactions(period_rows[names[0]] ?? []);
  }

  const combined = analyzeCombinedPeriods(period_rows);
  const count = names.length;
  const avgIncome = combined.total_income / count;
  const avgExpenses = combined.total_expenses / count;

  return {
    ...combined,
    total_income: avgIncome,
    total_expenses: avgExpenses,
    net_savings: avgIncome - avgExpenses,
    savings_rate: avgIncome ? ((avgIncome - avgExpenses) / avgIncome) * 100 : 0,
    income_categories: combined.income_categories.map((item) => ({
      ...item,
      total: item.total / count,
    })),
    expense_categories: combined.expense_categories.map((item) => ({
      ...item,
      total: item.total / count,
    })),
  };
}

export function buildAveragePeriodRows(period_rows: Record<string, Transaction[]>): Transaction[] {
  const names = Object.keys(period_rows);
  if (names.length <= 1) {
    return period_rows[names[0]] ?? [];
  }

  const analysis = analyzeCombinedPeriods(period_rows);
  const count = names.length;
  const rows: Transaction[] = [];
  let id = 0;

  for (const item of analysis.expense_categories) {
    rows.push({
      id: id++,
      merchant_name: `Average ${item.category}`,
      category: item.category,
      amount: item.total / count,
      period: AVERAGE_PERIOD_LABEL,
      transaction_type: "expense",
      abs_amount: item.total / count,
    });
  }

  for (const item of analysis.income_categories) {
    rows.push({
      id: id++,
      merchant_name: `Average ${item.category}`,
      category: item.category,
      amount: item.total / count,
      period: AVERAGE_PERIOD_LABEL,
      transaction_type: "income",
      abs_amount: item.total / count,
    });
  }

  return rows;
}

export function rebuildAnalyzeResponse(
  period_rows: Record<string, Transaction[]>,
  canonicalPeriods?: string[]
): AnalyzeResponse {
  const normalizedRows = normalizePeriodRows(period_rows);
  const uploadPeriods = canonicalPeriods?.length
    ? canonicalPeriods
    : filterReportablePeriodOrder(
        deriveUploadPeriods(normalizedRows),
        normalizedRows,
        periodHasReportableData
      );
  const consolidatedRows = consolidateRowsIntoUploadPeriods(normalizedRows, uploadPeriods);
  const reportableRows = Object.fromEntries(
    uploadPeriods.map((name) => [name, consolidatedRows[name] ?? []])
  );

  const period_analysis: AnalyzeResponse["period_analysis"] = {};
  for (const name of uploadPeriods) {
    period_analysis[name] = analyzeTransactions(reportableRows[name]);
  }

  let comparison = null;
  if (uploadPeriods.length >= 2) {
    const previous = uploadPeriods[uploadPeriods.length - 2];
    const current = uploadPeriods[uploadPeriods.length - 1];
    comparison = comparePeriods(
      reportableRows[previous],
      reportableRows[current],
      previous,
      current
    );
  }

  return {
    periods: uploadPeriods,
    upload_periods: uploadPeriods,
    period_analysis,
    period_rows: reportableRows,
    comparison,
    health_score: calculateHealthScore(reportableRows),
    categorization_flags: detectCategorizationIssues(reportableRows),
    advisor_notes: buildPeriodAdvice(reportableRows, comparison),
    privacy_notice:
      "Your file was analyzed only in this browser session. Nothing was uploaded to a server.",
  };
}

export function combineAllPeriodRows(period_rows: Record<string, Transaction[]>) {
  return Object.values(period_rows).flat();
}

export function analyzeCombinedPeriods(period_rows: Record<string, Transaction[]>) {
  return analyzeTransactions(combineAllPeriodRows(period_rows));
}

export function resolvePeriodReportSelection(
  period_rows: Record<string, Transaction[]>,
  periodOrder: string[],
  selection: PeriodReportSelection
): { periodLabel: string; periodAnalysis: PeriodAnalysis } {
  const normalizedRows = normalizePeriodRows(period_rows);
  const reportableOrder = filterReportablePeriodOrder(
    periodOrder,
    normalizedRows,
    periodHasReportableData
  );

  if (selection.mode === "single") {
    if (!reportableOrder.includes(selection.period)) {
      throw new Error(`No transaction data is available for period ${selection.period}.`);
    }
    const rows = normalizedRows[selection.period] ?? [];
    return {
      periodLabel: selection.period,
      periodAnalysis: analyzeTransactions(rows),
    };
  }

  const rangePeriods = slicePeriodOrder(reportableOrder, selection.start, selection.end).filter(
    (period) => periodHasReportableData(normalizedRows[period] ?? [])
  );
  if (!rangePeriods.length) {
    throw new Error("No transaction data is available for the selected period range.");
  }

  const rows = rangePeriods.flatMap((period) => normalizedRows[period] ?? []);
  return {
    periodLabel: periodRangeLabel(selection.start, selection.end),
    periodAnalysis: analyzeTransactions(rows),
  };
}

export function healthScoreForPeriodSelection(
  period_rows: Record<string, Transaction[]>,
  selection: string,
  periodOrder?: string[]
) {
  const normalizedRows = normalizePeriodRows(period_rows);
  const orderedNames = filterReportablePeriodOrder(
    periodOrder ?? orderedPeriodKeys(normalizedRows, Object.keys(normalizedRows)),
    normalizedRows,
    periodHasReportableData
  );

  if (selection === "All periods") {
    const combinedRows = combineAllPeriodRows(
      Object.fromEntries(orderedNames.map((name) => [name, normalizedRows[name] ?? []]))
    );
    const combinedScore = calculateHealthScoreForPeriod(
      { "All periods": combinedRows },
      "All periods",
      orderedNames
    );
    if (orderedNames.length <= 1) {
      return combinedScore;
    }

    const multiPeriodScore = calculateHealthScoreForPeriod(
      normalizedRows,
      orderedNames[orderedNames.length - 1],
      orderedNames
    );
    return {
      ...combinedScore,
      income_stability_score: multiPeriodScore.income_stability_score,
      overall: Math.round(
        combinedScore.savings_rate_score * 0.4 +
          multiPeriodScore.income_stability_score * 0.3 +
          combinedScore.non_essential_score * 0.3
      ),
      summary: healthSummary(
        Math.round(
          combinedScore.savings_rate_score * 0.4 +
            multiPeriodScore.income_stability_score * 0.3 +
            combinedScore.non_essential_score * 0.3
        )
      ),
      details: [
        combinedScore.details[0],
        multiPeriodScore.details[1],
        combinedScore.details[2],
      ],
      metrics: combinedScore.metrics
        ? {
            ...combinedScore.metrics,
            period_count: orderedNames.length,
            income_volatility_pct: multiPeriodScore.metrics?.income_volatility_pct ?? null,
            expense_volatility_pct: multiPeriodScore.metrics?.expense_volatility_pct ?? null,
          }
        : undefined,
    };
  }

  if (selection === AVERAGE_PERIOD_LABEL) {
    const averageRows = buildAveragePeriodRows(
      Object.fromEntries(orderedNames.map((name) => [name, normalizedRows[name] ?? []]))
    );
    return calculateHealthScoreForPeriod(
      {
        ...Object.fromEntries(orderedNames.map((name) => [name, normalizedRows[name] ?? []])),
        [AVERAGE_PERIOD_LABEL]: averageRows,
      },
      AVERAGE_PERIOD_LABEL,
      orderedNames
    );
  }

  if (!orderedNames.includes(selection)) {
    return calculateHealthScoreForPeriod({ [selection]: [] }, selection, orderedNames);
  }

  return calculateHealthScoreForPeriod(normalizedRows, selection, orderedNames);
}

export function healthScoreForReportSelection(
  period_rows: Record<string, Transaction[]>,
  periodOrder: string[],
  selection: PeriodReportSelection
) {
  const normalizedRows = normalizePeriodRows(period_rows);
  const reportableOrder = filterReportablePeriodOrder(
    periodOrder,
    normalizedRows,
    periodHasReportableData
  );

  if (selection.mode === "single") {
    return healthScoreForPeriodSelection(normalizedRows, selection.period, reportableOrder);
  }

  const rangePeriods = slicePeriodOrder(reportableOrder, selection.start, selection.end).filter(
    (period) => periodHasReportableData(normalizedRows[period] ?? [])
  );
  if (!rangePeriods.length) {
    const rangeLabel = periodRangeLabel(selection.start, selection.end);
    return calculateHealthScoreForPeriod({ [rangeLabel]: [] }, rangeLabel, []);
  }

  const combinedRows = rangePeriods.flatMap((period) => normalizedRows[period] ?? []);
  const rangeLabel = periodRangeLabel(selection.start, selection.end);
  return calculateHealthScoreForPeriod(
    {
      ...Object.fromEntries(reportableOrder.map((name) => [name, normalizedRows[name] ?? []])),
      [rangeLabel]: combinedRows,
    },
    rangeLabel,
    rangePeriods
  );
}
