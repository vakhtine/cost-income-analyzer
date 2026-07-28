"use client";

import { PeriodSelect } from "@/components/PeriodSelect";
import { useCurrency } from "@/lib/currency-context";
import { AnalyzeResponse, PeriodAnalysis } from "@/lib/types";
import { countUnknownTransactions } from "@/lib/categorization";

type Props = {
  data: AnalyzeResponse;
};

type SnapshotProps = {
  analysis: PeriodAnalysis;
  periodLabel: string;
  periods: string[];
  selectedPeriod: string;
  onPeriodChange: (period: string) => void;
};

export function CleanStepSummary({ data }: Props) {
  const unknownCount = countUnknownTransactions(Object.values(data.period_rows).flat());
  const flagCount = data.categorization_flags.length;
  const uploadPeriods = data.upload_periods ?? data.periods;

  return (
    <section className="step-summary card">
      <h3>Data quality check</h3>
      <div className="step-summary-grid">
        <div className="step-summary-item">
          <span>Periods loaded</span>
          <strong>{uploadPeriods.length}</strong>
        </div>
        <div className="step-summary-item">
          <span>Unknown / uncategorized</span>
          <strong className={unknownCount ? "warning" : ""}>{unknownCount}</strong>
        </div>
        <div className="step-summary-item">
          <span>Items to review</span>
          <strong className={flagCount ? "warning" : ""}>{flagCount}</strong>
        </div>
      </div>
      <p className="step-summary-note">
        {uploadPeriods.length > 0 && (
          <>
            Periods: <strong>{uploadPeriods.join(", ")}</strong>.{" "}
          </>
        )}
        {unknownCount || flagCount
          ? "Review unknown or uncategorized merchants below so your analysis and relocation reports are accurate."
          : "Your categories look clean. You can move on to analysis or keep reviewing."}
      </p>
    </section>
  );
}

export function AnalyzeStepSummary({
  analysis,
  periodLabel,
  periods,
  selectedPeriod,
  onPeriodChange,
}: SnapshotProps) {
  const { formatIncome, formatExpense } = useCurrency();

  return (
    <section className="step-summary card">
      <div className="section-heading section-heading-with-period">
        <PeriodSelect
          periods={periods}
          value={selectedPeriod}
          onChange={onPeriodChange}
        />
        <h3 className="section-heading-content">Your financial snapshot — {periodLabel}</h3>
      </div>
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
