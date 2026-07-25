"use client";

import { HEALTH_SCORE_METHODOLOGY } from "@/lib/health-score";
import { useCurrency } from "@/lib/currency-context";
import {
  AVERAGE_PERIOD_LABEL,
  healthScoreForPeriodSelection,
} from "@/lib/rebuild";
import { buildConsecutivePeriodPairs, comparePeriods } from "@/lib/period-analyzer";
import { AnalyzeResponse, HealthScore } from "@/lib/types";
import { CategoryChangeCard } from "@/components/CategoryChangeCard";
import { useEffect, useMemo, useState } from "react";

function ScoreRing({ score, label }: { score: number; label: string }) {
  const degrees = (score / 100) * 360;
  const tone = score >= 80 ? "good" : score >= 50 ? "mid" : "low";

  return (
    <div className="score-ring-wrap">
      <div
        className={`score-ring ${tone}`}
        style={{ background: `conic-gradient(var(--ring-color) ${degrees}deg, #e2e8f0 0deg)` }}
      >
        <div className="score-ring-inner">
          <div className="score-ring-value">{score}</div>
          <div className="score-ring-max">/100</div>
        </div>
      </div>
      <div className="score-ring-label">{label}</div>
    </div>
  );
}

function BreakdownBar({
  label,
  score,
  detail,
  icon,
}: {
  label: string;
  score: number;
  detail: string;
  icon: string;
}) {
  const tone = score >= 80 ? "good" : score >= 50 ? "mid" : "low";

  return (
    <article className={`health-factor-card health-${tone}`}>
      <div className="health-factor-header">
        <div className="health-factor-title">
          <span className="health-factor-icon" aria-hidden="true">
            {icon}
          </span>
          <strong>{label}</strong>
        </div>
        <span className={`health-factor-score health-${tone}`}>{score}/100</span>
      </div>
      <div className="health-factor-track">
        <div className={`health-factor-fill health-${tone}`} style={{ width: `${score}%` }} />
      </div>
      <p className="health-factor-detail">{detail}</p>
    </article>
  );
}

function HealthMetricsGrid({ healthScore }: { healthScore: HealthScore }) {
  const { formatIncome, formatExpense } = useCurrency();
  const metrics = healthScore.metrics;

  if (!metrics) {
    return null;
  }

  return (
    <div className="health-metrics-grid">
      <div className="health-metric-card">
        <span>Savings rate</span>
        <strong>{metrics.savings_rate_pct.toFixed(1)}%</strong>
      </div>
      <div className="health-metric-card">
        <span>Total income</span>
        <strong>{formatIncome(metrics.total_income)}</strong>
      </div>
      <div className="health-metric-card">
        <span>Total expenses</span>
        <strong>{formatExpense(metrics.total_expenses)}</strong>
      </div>
      <div className="health-metric-card">
        <span>Net savings</span>
        <strong className={metrics.net_savings >= 0 ? "pos" : "neg"}>
          {formatIncome(metrics.net_savings)}
        </strong>
      </div>
      <div className="health-metric-card">
        <span>Expense / income ratio</span>
        <strong>{metrics.expense_to_income_ratio.toFixed(1)}%</strong>
      </div>
      <div className="health-metric-card">
        <span>Non-essential spending</span>
        <strong>
          {formatExpense(metrics.non_essential_total)} (
          {metrics.non_essential_of_expenses_pct.toFixed(1)}% of expenses)
        </strong>
      </div>
      <div className="health-metric-card">
        <span>Income sources</span>
        <strong>{metrics.income_source_count}</strong>
      </div>
      <div className="health-metric-card">
        <span>Periods analyzed</span>
        <strong>{metrics.period_count}</strong>
      </div>
      <div className="health-metric-card">
        <span>Income volatility</span>
        <strong>
          {metrics.income_volatility_pct !== null
            ? `${metrics.income_volatility_pct.toFixed(1)}%`
            : "N/A (single period)"}
        </strong>
      </div>
      <div className="health-metric-card">
        <span>Largest expense category</span>
        <strong>
          {metrics.largest_expense_category} ({formatExpense(metrics.largest_expense_amount)})
        </strong>
      </div>
      <div
        className="health-metric-card"
        title="How much total expenses swing period to period (standard deviation divided by average). Lower volatility means more predictable spending."
      >
        <span>Expense volatility</span>
        <strong>
          {metrics.expense_volatility_pct !== null
            ? `${metrics.expense_volatility_pct.toFixed(1)}%`
            : "N/A (single period)"}
        </strong>
      </div>
      <div
        className="health-metric-card"
        title="Total monthly expenses divided by 30 — your average daily burn rate for budgeting."
      >
        <span>Average daily spend</span>
        <strong>{formatExpense(metrics.avg_daily_spend)}</strong>
      </div>
    </div>
  );
}

function periodSelectionLabel(selection: string) {
  if (selection === "All periods") return "All periods";
  if (selection === AVERAGE_PERIOD_LABEL) return "Average (all periods)";
  return selection;
}

export function HealthMetricsPanel({ data }: { data: AnalyzeResponse }) {
  const latest = data.periods[data.periods.length - 1];
  const [metricsPeriod, setMetricsPeriod] = useState(latest);

  useEffect(() => {
    if (
      !metricsPeriod ||
      (!data.periods.includes(metricsPeriod) &&
        metricsPeriod !== AVERAGE_PERIOD_LABEL &&
        metricsPeriod !== "All periods")
    ) {
      setMetricsPeriod(latest);
    }
  }, [data, latest, metricsPeriod]);

  const healthScore = useMemo(
    () => healthScoreForPeriodSelection(data.period_rows, metricsPeriod),
    [data.period_rows, metricsPeriod]
  );

  return (
    <section className="card health-metrics-panel">
      <div className="section-heading">
        <h3>Additional health metrics</h3>
        <p>
          Raw numbers behind your score for{" "}
          <strong>{periodSelectionLabel(metricsPeriod)}</strong> — useful for spotting trends and
          trade-offs.
        </p>
      </div>
      <label className="analyze-period-label health-metrics-period-label">
        Metrics period
        <select
          value={metricsPeriod}
          onChange={(event) => setMetricsPeriod(event.target.value)}
        >
          {data.periods.map((period) => (
            <option key={period} value={period}>
              {period}
            </option>
          ))}
          {data.periods.length > 1 && (
            <>
              <option value="All periods">All periods</option>
              <option value={AVERAGE_PERIOD_LABEL}>Average (all periods)</option>
            </>
          )}
        </select>
      </label>
      <HealthMetricsGrid healthScore={healthScore} />
    </section>
  );
}

export function FinancialHealthPanel({ data }: { data: AnalyzeResponse }) {
  const { health_score } = data;

  return (
    <div className="stack">
      <section className="card advisor-hero">
        <div className="advisor-hero-grid">
          <ScoreRing score={health_score.overall} label="Financial health score" />
          <div>
            <p className="advisor-summary">{health_score.summary}</p>
            <p className="insight advisor-score-note">
              This financial health score measures savings habits and spending patterns. Relocation
              affordability (on the Relocate tab) is a separate score based on whether destination
              city costs fit your scenario income — both can differ without being an error.
            </p>
            <div className="health-factor-grid">
              <BreakdownBar
                label="Savings rate"
                score={health_score.savings_rate_score}
                detail={health_score.details[0]}
                icon="💰"
              />
              <BreakdownBar
                label="Income stability"
                score={health_score.income_stability_score}
                detail={health_score.details[1]}
                icon="📊"
              />
              <BreakdownBar
                label="Non-essential control"
                score={health_score.non_essential_score}
                detail={health_score.details[2]}
                icon="🎯"
              />
            </div>
          </div>
        </div>
      </section>

      <HealthMetricsPanel data={data} />

      <section className="card methodology-card">
        <h3>How these scores are calculated</h3>
        <div className="methodology-grid">
          <div>
            <strong>Savings rate (40% weight)</strong>
            <p>Net savings as a percentage of income in the latest period.</p>
          </div>
          <div>
            <strong>Income stability (30% weight)</strong>
            <p>{HEALTH_SCORE_METHODOLOGY.income_stability}</p>
          </div>
          <div>
            <strong>Non-essential spending (30% weight)</strong>
            <p>{HEALTH_SCORE_METHODOLOGY.non_essential}</p>
          </div>
        </div>
      </section>
    </div>
  );
}

export function PeriodChangePanel({ data }: { data: AnalyzeResponse }) {
  const { formatIncome, formatExpense } = useCurrency();
  const pairs = useMemo(() => buildConsecutivePeriodPairs(data.periods), [data.periods]);
  const [selectedPairIndex, setSelectedPairIndex] = useState(0);

  useEffect(() => {
    setSelectedPairIndex(Math.max(0, pairs.length - 1));
  }, [pairs.length]);

  const comparison = useMemo(() => {
    const pair = pairs[selectedPairIndex];
    if (!pair) return null;
    return comparePeriods(
      data.period_rows[pair.previous] ?? [],
      data.period_rows[pair.current] ?? [],
      pair.previous,
      pair.current
    );
  }, [data.period_rows, pairs, selectedPairIndex]);

  if (pairs.length === 0) {
    return (
      <section className="card">
        <p className="insight">
          Upload multiple months or Excel tabs to unlock period-over-period insights.
        </p>
      </section>
    );
  }

  if (!comparison) {
    return null;
  }

  return (
    <section className="card period-change-card">
      <div className="section-heading">
        <h3>Period change</h3>
        <p>
          Compare one month to the next — select a consecutive pair below. Each category shows at
          most three merchants or transactions that best explain the change.
        </p>
      </div>

      <label className="analyze-period-label period-change-label">
        Month-to-month comparison
        <select
          value={selectedPairIndex}
          onChange={(event) => setSelectedPairIndex(Number(event.target.value))}
        >
          {pairs.map((pair, index) => (
            <option key={pair.label} value={index}>
              {pair.label}
            </option>
          ))}
        </select>
      </label>

      <div className="summary-pills">
        <div className={`summary-pill ${comparison.income_change >= 0 ? "good" : "bad"}`}>
          <span>Income</span>
          <strong>
            {comparison.income_change >= 0 ? "+" : ""}
            {formatIncome(comparison.income_change)} ({comparison.income_change_pct >= 0 ? "+" : ""}
            {comparison.income_change_pct.toFixed(1)}%)
          </strong>
        </div>
        <div className={`summary-pill ${comparison.expense_change <= 0 ? "good" : "bad"}`}>
          <span>Expenses</span>
          <strong>
            {comparison.expense_change >= 0 ? "+" : ""}
            {formatExpense(comparison.expense_change)} ({comparison.expense_change_pct >= 0 ? "+" : ""}
            {comparison.expense_change_pct.toFixed(1)}%)
          </strong>
        </div>
      </div>

      <div className="change-grid">
        {comparison.category_changes.slice(0, 10).map((change) => (
          <CategoryChangeCard
            key={`${change.category}-${change.transaction_type}`}
            change={change}
          />
        ))}
      </div>
    </section>
  );
}

export function AdvisorView({ data }: { data: AnalyzeResponse }) {
  return (
    <div className="stack">
      <PeriodChangePanel data={data} />
    </div>
  );
}
