"use client";

import { useCurrency } from "@/lib/currency-context";
import { AnalyzeResponse, PeriodAnalysis } from "@/lib/types";

type Props = {
  data: AnalyzeResponse;
};

type SnapshotProps = {
  analysis: PeriodAnalysis;
  periodLabel: string;
};

export function CleanStepSummary({ data }: Props) {
  const unknownCount = Object.values(data.period_rows)
    .flat()
    .filter((row) => row.category.trim().toLowerCase() === "unknown").length;
  const flagCount = data.categorization_flags.length;

  return (
    <section className="step-summary card">
      <h3>Data quality check</h3>
      <div className="step-summary-grid">
        <div className="step-summary-item">
          <span>Periods loaded</span>
          <strong>{data.periods.length}</strong>
        </div>
        <div className="step-summary-item">
          <span>Unknown categories</span>
          <strong className={unknownCount ? "warning" : ""}>{unknownCount}</strong>
        </div>
        <div className="step-summary-item">
          <span>Items to review</span>
          <strong className={flagCount ? "warning" : ""}>{flagCount}</strong>
        </div>
      </div>
      <p className="step-summary-note">
        {unknownCount || flagCount
          ? "Review unknown merchants and AI suggestions below so your relocation analysis is accurate."
          : "Your categories look clean. You can move on to analysis or keep reviewing."}
      </p>
    </section>
  );
}

export function AnalyzeStepSummary({ analysis, periodLabel }: SnapshotProps) {
  const { formatIncome, formatExpense } = useCurrency();

  return (
    <section className="step-summary card">
      <h3>Your financial snapshot — {periodLabel}</h3>
      <div className="step-summary-grid">
        <div className="step-summary-item">
          <span>Monthly income</span>
          <strong>{formatIncome(analysis.total_income)}</strong>
        </div>
        <div className="step-summary-item">
          <span>Monthly expenses</span>
          <strong>{formatExpense(analysis.total_expenses)}</strong>
        </div>
        <div className="step-summary-item">
          <span>Net savings</span>
          <strong className={analysis.net_savings >= 0 ? "positive" : "negative"}>
            {formatIncome(analysis.net_savings)}
          </strong>
        </div>
        <div className="step-summary-item">
          <span>Savings rate</span>
          <strong>{analysis.savings_rate.toFixed(1)}%</strong>
        </div>
      </div>
    </section>
  );
}
