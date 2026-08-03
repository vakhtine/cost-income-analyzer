"use client";

import { HEALTH_SCORE_METHODOLOGY } from "@/lib/health-score";
import { useCurrency } from "@/lib/currency-context";
import {
  concentrationHhiTone,
  diversificationScoreTone,
  incomeSourceCountTone,
  metricToneToBand,
  MetricTone,
  netSavingsTone,
  savingsRateTone,
  topCategoryShareTone,
  volatilityPctTone,
} from "@/lib/metric-tones";
import {
  AVERAGE_PERIOD_LABEL,
  healthScoreForPeriodSelection,
} from "@/lib/rebuild";
import { buildConsecutivePeriodPairs, comparePeriods } from "@/lib/period-analyzer";
import { AnalyzeResponse, HealthScore, PeriodAnalysis } from "@/lib/types";
import { CategoryChangeCard } from "@/components/CategoryChangeCard";
import { InsightsPanel } from "@/components/DashboardView";
import { PeriodSelect } from "@/components/PeriodSelect";
import { scoreBandLabel, scoreBandTone } from "@/lib/report-charts";
import { UI_LABELS } from "@/lib/ui-labels";
import { useEffect, useMemo, useState } from "react";

function ScoreHero({ score, label, kind = "health" as const }: { score: number; label: string; kind?: "health" | "relocation" }) {
  const tone = scoreBandTone(score);
  const band = scoreBandLabel(score, kind);

  return (
    <div className={`score-hero-ui score-hero-ui-${tone}`}>
      <div className="score-hero-ui-value">{score}</div>
      <div className="score-hero-ui-band">{band}</div>
      <div className="score-hero-ui-name">{label}</div>
    </div>
  );
}

function BreakdownBar({
  label,
  score,
  icon,
}: {
  label: string;
  score: number;
  detail: string;
  icon: string;
}) {
  const tone = score >= 80 ? "good" : score >= 50 ? "mid" : "low";
  const showInside = score >= 25;

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
        <div className={`health-factor-fill health-${tone}`} style={{ width: `${Math.max(4, score)}%` }}>
          {showInside ? <span className="health-factor-bar-label">{score}</span> : null}
        </div>
      </div>
    </article>
  );
}

function QuickStatCard({
  label,
  value,
  tone,
  detail,
}: {
  label: string;
  value: string;
  tone: MetricTone;
  detail?: string;
}) {
  const band = metricToneToBand(tone);
  return (
    <div className={`quick-stat-card quick-stat-${band}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      {detail ? <p className="quick-stat-detail">{detail}</p> : null}
    </div>
  );
}

function QuickStatsGrid({ healthScore }: { healthScore: HealthScore }) {
  const { formatIncome, formatExpense } = useCurrency();
  const metrics = healthScore.metrics;

  if (!metrics) {
    return null;
  }

  return (
    <div className="quick-stats-sections">
      <section className="quick-stats-section">
        <h4 className="quick-stats-section-title">Income</h4>
        <div className="quick-stats-grid">
          <QuickStatCard
            label="Income sources"
            value={String(metrics.income_source_count)}
            tone={incomeSourceCountTone(metrics.income_source_count)}
          />
          <QuickStatCard
            label="Total income"
            value={formatIncome(metrics.total_income)}
            tone={metrics.total_income > 0 ? "positive" : "negative"}
          />
          <QuickStatCard
            label="Savings rate"
            value={`${metrics.savings_rate_pct.toFixed(1)}%`}
            tone={savingsRateTone(metrics.savings_rate_pct)}
          />
          <QuickStatCard
            label="Net savings"
            value={formatIncome(metrics.net_savings)}
            tone={netSavingsTone(metrics.net_savings)}
          />
          <QuickStatCard
            label="Income stability"
            value={`${healthScore.income_stability_score}/100`}
            tone={diversificationScoreTone(healthScore.income_stability_score)}
            detail={HEALTH_SCORE_METHODOLOGY.income_stability}
          />
          <QuickStatCard
            label="Income volatility (month to month)"
            value={
              metrics.income_volatility_pct !== null
                ? `${metrics.income_volatility_pct.toFixed(1)}%`
                : "N/A (single period)"
            }
            tone={volatilityPctTone(metrics.income_volatility_pct)}
          />
        </div>
      </section>

      <section className="quick-stats-section">
        <h4 className="quick-stats-section-title">Expenses</h4>
        <div className="quick-stats-grid">
          <QuickStatCard
            label="Total expenses"
            value={formatExpense(metrics.total_expenses)}
            tone="info"
          />
          <QuickStatCard
            label="Periods analyzed"
            value={String(metrics.period_count)}
            tone="info"
          />
          <QuickStatCard
            label="Concentration (HHI, expenses categories)"
            value={metrics.expense_concentration_hhi.toFixed(2)}
            tone={concentrationHhiTone(metrics.expense_concentration_hhi)}
          />
          <QuickStatCard
            label={UI_LABELS.topExpensesCategoryShare}
            value={`${metrics.top_category_share_pct.toFixed(1)}%, ${metrics.largest_expense_category}`}
            tone={topCategoryShareTone(metrics.top_category_share_pct)}
          />
          <QuickStatCard
            label={UI_LABELS.expenseVolatility}
            value={
              metrics.expense_volatility_pct !== null
                ? `${metrics.expense_volatility_pct.toFixed(1)}%`
                : "N/A (single period)"
            }
            tone={volatilityPctTone(metrics.expense_volatility_pct)}
            detail={HEALTH_SCORE_METHODOLOGY.expense_volatility}
          />
          <QuickStatCard
            label="Avg daily spend"
            value={formatExpense(metrics.avg_daily_spend)}
            tone="info"
          />
        </div>
      </section>
    </div>
  );
}

function periodSelectionLabel(selection: string) {
  if (selection === "All periods") return "All periods";
  if (selection === AVERAGE_PERIOD_LABEL) return "Average (all periods)";
  return selection;
}

export function HealthMetricsPanel({
  data,
  selectedPeriod,
  onPeriodChange,
}: {
  data: AnalyzeResponse;
  selectedPeriod: string;
  onPeriodChange: (period: string) => void;
}) {
  const latest = data.periods[data.periods.length - 1];
  const effectivePeriod = selectedPeriod || latest;
  const healthScore = useMemo(
    () => healthScoreForPeriodSelection(data.period_rows, effectivePeriod, data.periods),
    [data.period_rows, data.periods, effectivePeriod]
  );

  return (
    <section className="card health-metrics-panel insights-panel">
      <div className="section-heading section-heading-with-period">
        <PeriodSelect
          periods={data.periods}
          value={effectivePeriod}
          onChange={onPeriodChange}
        />
        <div className="section-heading-content insights-panel-header">
          <div className="insights-panel-badge">Metrics</div>
          <h3>Quick stats</h3>
          <p>
            Raw numbers behind your score for{" "}
            <strong>{periodSelectionLabel(effectivePeriod)}</strong> — green is excellent, amber is
            good, red needs attention.
          </p>
        </div>
      </div>
      <QuickStatsGrid healthScore={healthScore} />
    </section>
  );
}

export function FinancialHealthPanel({
  data,
  selectedPeriod,
  onPeriodChange,
  insightsAnalysis,
}: {
  data: AnalyzeResponse;
  selectedPeriod: string;
  onPeriodChange: (period: string) => void;
  insightsAnalysis?: PeriodAnalysis | null;
}) {
  const latest = data.periods[data.periods.length - 1];
  const effectivePeriod = selectedPeriod || latest;
  const healthScore = useMemo(
    () => healthScoreForPeriodSelection(data.period_rows, effectivePeriod, data.periods),
    [data.period_rows, data.periods, effectivePeriod]
  );

  return (
    <div className="stack">
      <section className="card advisor-hero">
        <div className="section-heading section-heading-with-period">
          <PeriodSelect
            periods={data.periods}
            value={effectivePeriod}
            onChange={onPeriodChange}
          />
          <div className="section-heading-content">
            <h3>Financial health score</h3>
            <p className="advisor-summary">{healthScore.summary}</p>
          </div>
        </div>
        <div className="advisor-hero-grid advisor-hero-grid-compact">
          <ScoreHero score={healthScore.overall} label="Financial health score" />
          <div className="advisor-hero-details">
            <div className="health-factor-grid">
              <BreakdownBar
                label="Savings rate"
                score={healthScore.savings_rate_score}
                detail={healthScore.details[0]}
                icon="💰"
              />
              <BreakdownBar
                label="Income stability"
                score={healthScore.income_stability_score}
                detail={healthScore.details[1]}
                icon="📊"
              />
              <BreakdownBar
                label="Expense stability"
                score={healthScore.expense_stability_score}
                detail={healthScore.details[2]}
                icon="📉"
              />
              <BreakdownBar
                label="Non-essential control"
                score={healthScore.non_essential_score}
                detail={healthScore.details[3]}
                icon="🎯"
              />
            </div>
          </div>
        </div>
      </section>

      <HealthMetricsPanel
        data={data}
        selectedPeriod={effectivePeriod}
        onPeriodChange={onPeriodChange}
      />

      {insightsAnalysis && <InsightsPanel analysis={insightsAnalysis} />}

      <section className="card methodology-card">
        <h3>How these scores are calculated</h3>
        <div className="methodology-grid">
          <div>
            <strong>Savings rate (30% weight)</strong>
            <p>{HEALTH_SCORE_METHODOLOGY.savings_rate}</p>
          </div>
          <div>
            <strong>Income stability (25% weight)</strong>
            <p>{HEALTH_SCORE_METHODOLOGY.income_stability}</p>
          </div>
          <div>
            <strong>Expense stability (25% weight)</strong>
            <p>{HEALTH_SCORE_METHODOLOGY.expense_stability}</p>
          </div>
          <div>
            <strong>Non-essential spending (20% weight)</strong>
            <p>{HEALTH_SCORE_METHODOLOGY.non_essential}</p>
          </div>
          <div>
            <strong>Expense concentration (HHI)</strong>
            <p>{HEALTH_SCORE_METHODOLOGY.expense_concentration}</p>
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
