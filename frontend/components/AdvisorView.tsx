"use client";

import { HEALTH_SCORE_METHODOLOGY, HEALTH_SCORE_WEIGHT_ITEMS } from "@/lib/health-score";
import { plainExplanation, plainLabel } from "@/lib/metric-plain-language";
import { useHealthScoreDetails, useMethodologyDetails, useMetricsDetails } from "@/lib/plain-language-context";
import { useCurrency } from "@/lib/currency-context";
import {
  concentrationHhiTone,
  diversificationScoreTone,
  hhiConcentrationLabel,
  incomeSourceCountTone,
  metricToneToBand,
  MetricTone,
  netSavingsTone,
  discretionarySpendingTone,
  topCategoryShareTone,
  volatilityPctLabel,
} from "@/lib/metric-tones";
import {
  AVERAGE_PERIOD_LABEL,
  healthScoreForPeriodSelection,
} from "@/lib/rebuild";
import { buildConsecutivePeriodPairs, comparePeriods } from "@/lib/period-analyzer";
import { AnalyzeResponse, HealthScore } from "@/lib/types";
import { CategoryChangeCard } from "@/components/CategoryChangeCard";
import { PeriodSelect } from "@/components/PeriodSelect";
import { SectionDetailToggle } from "@/components/SectionDetailToggle";
import { scoreBandLabel, scoreBandTone } from "@/lib/report-charts";
import { UI_LABELS } from "@/lib/ui-labels";
import { formatPctChangeLabel } from "@/lib/utils";
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
  explanationKey,
  detail,
  showDetails,
}: {
  label: string;
  score: number;
  detail: string;
  icon: string;
  explanationKey: string;
  showDetails: boolean;
}) {
  const displayLabel = plainLabel(explanationKey, showDetails, label);
  const explanation = plainExplanation(explanationKey, showDetails);
  const tone = score >= 80 ? "good" : score >= 50 ? "mid" : "low";
  const showInside = score >= 25;

  return (
    <article className={`health-factor-card health-${tone}`}>
      <div className="health-factor-header">
        <div className="health-factor-title">
          <span className="health-factor-icon" aria-hidden="true">
            {icon}
          </span>
          <div className="health-factor-title-copy">
            <strong>{displayLabel}</strong>
            {explanation ? <p className="metric-plain-hint">{explanation}</p> : null}
          </div>
        </div>
        <span className={`health-factor-score health-${tone}`}>{score}/100</span>
      </div>
      <div className="health-factor-track">
        <div className={`health-factor-fill health-${tone}`} style={{ width: `${Math.max(4, score)}%` }}>
          {showInside ? <span className="health-factor-bar-label">{score}</span> : null}
        </div>
      </div>
      {showDetails && detail ? <p className="health-factor-detail">{detail}</p> : null}
    </article>
  );
}

function QuickStatCard({
  label,
  value,
  tone,
  detail,
  explanationKey,
  showDetails,
  combinedValue = false,
  valueSubline,
}: {
  label: string;
  value: string;
  tone: MetricTone;
  detail?: string;
  explanationKey: string;
  showDetails: boolean;
  combinedValue?: boolean;
  valueSubline?: string;
}) {
  const band = metricToneToBand(tone);
  const displayLabel = plainLabel(explanationKey, showDetails, label);
  const explanation =
    plainExplanation(explanationKey, showDetails) ??
    (showDetails && detail ? detail : null);

  return (
    <div className={`quick-stat-card quick-stat-${band}`}>
      <span>{displayLabel}</span>
      {showDetails && explanation ? <p className="metric-plain-hint">{explanation}</p> : null}
      <div className="quick-stat-value-wrap">
        <strong className={combinedValue ? "quick-stat-value-combined" : undefined}>{value}</strong>
        {valueSubline ? <span className="quick-stat-value-subline">{valueSubline}</span> : null}
      </div>
      {showDetails && detail ? <p className="quick-stat-detail">{detail}</p> : null}
    </div>
  );
}

function formatIncomeStabilityValue(score: number, volatilityPct: number | null) {
  const volatilityLabel =
    volatilityPct !== null ? `${volatilityPct.toFixed(1)}%` : "N/A (single period)";
  return `${score}/100 - ${volatilityLabel}`;
}

function formatExpenseStabilityValue(score: number, volatilityPct: number | null) {
  const volatilityLabel =
    volatilityPct !== null ? `${volatilityPct.toFixed(1)}%` : "N/A (single period)";
  return `${score}/100 - ${volatilityLabel}`;
}

function QuickStatsGrid({
  healthScore,
  showDetails,
}: {
  healthScore: HealthScore;
  showDetails: boolean;
}) {
  const { formatIncome, formatExpense } = useCurrency();
  const metrics = healthScore.metrics;

  if (!metrics) {
    return null;
  }

  return (
    <div className="quick-stats-sections">
      <section className="quick-stats-section quick-stats-section-income">
        <h4 className="quick-stats-section-title">Income</h4>
        <div className="quick-stats-grid quick-stats-grid-income">
          <QuickStatCard
            label="Income sources"
            explanationKey="Income sources"
            value={String(metrics.income_source_count)}
            tone={incomeSourceCountTone(metrics.income_source_count)}
            showDetails={showDetails}
          />
          <QuickStatCard
            label="Total income"
            explanationKey="Total income"
            value={formatIncome(metrics.total_income)}
            tone={metrics.total_income > 0 ? "positive" : "negative"}
            showDetails={showDetails}
          />
          <QuickStatCard
            label="Savings rate & net savings"
            explanationKey="Savings rate & net savings"
            value={`${metrics.savings_rate_pct.toFixed(1)}% - ${formatIncome(metrics.net_savings)}`}
            tone={netSavingsTone(metrics.net_savings)}
            showDetails={showDetails}
            combinedValue
          />
          <QuickStatCard
            label="Income stability & volatility"
            explanationKey="Income stability & volatility"
            value={formatIncomeStabilityValue(
              healthScore.income_stability_score,
              metrics.income_volatility_pct
            )}
            tone={diversificationScoreTone(healthScore.income_stability_score)}
            showDetails={showDetails}
            combinedValue
          />
        </div>
      </section>

      <section className="quick-stats-section quick-stats-section-expenses">
        <h4 className="quick-stats-section-title">Expenses</h4>
        <div className="quick-stats-grid quick-stats-grid-expenses">
          <QuickStatCard
            label="Total expenses"
            explanationKey="Total expenses"
            value={formatExpense(metrics.total_expenses)}
            tone="info"
            showDetails={showDetails}
          />
          <QuickStatCard
            label="Discretionary spending"
            explanationKey="Discretionary spending"
            value={`${metrics.non_essential_of_expenses_pct.toFixed(1)}% - ${formatExpense(metrics.non_essential_total)}`}
            tone={discretionarySpendingTone(metrics.non_essential_of_expenses_pct)}
            showDetails={showDetails}
            combinedValue
          />
          <QuickStatCard
            label="Concentration (HHI, expense categories)"
            explanationKey="Concentration (HHI, expense categories)"
            value={metrics.expense_concentration_hhi.toFixed(2)}
            valueSubline={hhiConcentrationLabel(metrics.expense_concentration_hhi)}
            tone={concentrationHhiTone(metrics.expense_concentration_hhi)}
            showDetails={showDetails}
          />
          <QuickStatCard
            label={UI_LABELS.topExpensesCategoryShare}
            explanationKey="Top expense category share"
            value={`${metrics.top_category_share_pct.toFixed(1)}%`}
            valueSubline={metrics.largest_expense_category}
            tone={topCategoryShareTone(metrics.top_category_share_pct)}
            showDetails={showDetails}
          />
          <QuickStatCard
            label="Expense stability & volatility"
            explanationKey="Expense stability & volatility"
            value={formatExpenseStabilityValue(
              healthScore.expense_stability_score,
              metrics.expense_volatility_pct
            )}
            valueSubline={
              metrics.expense_volatility_pct !== null
                ? volatilityPctLabel(metrics.expense_volatility_pct)
                : undefined
            }
            tone={diversificationScoreTone(healthScore.expense_stability_score)}
            showDetails={showDetails}
            combinedValue
            detail={
              metrics.period_count > 1 && metrics.expense_volatility_pct !== null
                ? `Based on ${metrics.period_count} included month(s). Volatility measures how much total spending swings across those months — not the change between two selected months.`
                : undefined
            }
          />
          <QuickStatCard
            label="Avg daily spend"
            explanationKey="Avg daily spend"
            value={formatExpense(metrics.avg_daily_spend)}
            tone="info"
            showDetails={showDetails}
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
  const { showDetails, toggleDetails } = useMetricsDetails();
  const latest = data.periods[data.periods.length - 1];
  const effectivePeriod = selectedPeriod || latest;
  const healthScore = useMemo(
    () => healthScoreForPeriodSelection(data.period_rows, effectivePeriod, data.periods),
    [data.period_rows, data.periods, effectivePeriod]
  );

  return (
    <section className="card health-metrics-panel insights-panel">
      <div className="section-card-top">
        <div className="section-heading section-heading-with-period health-metrics-heading">
          <PeriodSelect
            periods={data.periods}
            value={effectivePeriod}
            onChange={onPeriodChange}
          />
          <div className="section-heading-content insights-panel-header">
            <div className="insights-panel-badge">Metrics</div>
            <h3>Quick stats</h3>
            {showDetails ? (
              <p>
                Supporting numbers for{" "}
                <strong>{periodSelectionLabel(effectivePeriod)}</strong> with brief explanations
                for each metric.
              </p>
            ) : (
              <p>
                Metrics behind your score for{" "}
                <strong>{periodSelectionLabel(effectivePeriod)}</strong> — green is excellent,
                amber is good, red needs attention.
              </p>
            )}
          </div>
        </div>
        <SectionDetailToggle
          enabled={showDetails}
          onToggle={toggleDetails}
          label="Show details"
          title="Show or hide metric explanations in quick stats"
        />
      </div>
      <QuickStatsGrid healthScore={healthScore} showDetails={showDetails} />
    </section>
  );
}

export function HealthMethodologyPanel() {
  const { showDetails, toggleDetails } = useMethodologyDetails();

  return (
    <section className="card methodology-card">
      <div className="section-card-top section-card-top-compact">
        <h3>How these stats are calculated</h3>
        <SectionDetailToggle
          enabled={showDetails}
          onToggle={toggleDetails}
          label="Show explanations"
          title="Show or hide how each score criterion is calculated"
        />
      </div>
      <div className="methodology-grid">
        {HEALTH_SCORE_WEIGHT_ITEMS.map((item) => (
          <div key={item.label}>
            <strong>{item.label}</strong>
            {showDetails ? <p>{HEALTH_SCORE_METHODOLOGY[item.key]}</p> : null}
          </div>
        ))}
        <div>
          <strong>Expense concentration (HHI)</strong>
          {showDetails ? <p>{HEALTH_SCORE_METHODOLOGY.expense_concentration}</p> : null}
        </div>
      </div>
    </section>
  );
}

export function FinancialHealthPanel({
  data,
  selectedPeriod,
  onPeriodChange,
}: {
  data: AnalyzeResponse;
  selectedPeriod: string;
  onPeriodChange: (period: string) => void;
}) {
  const { showDetails, toggleDetails } = useHealthScoreDetails();
  const latest = data.periods[data.periods.length - 1];
  const effectivePeriod = selectedPeriod || latest;
  const healthScore = useMemo(
    () => healthScoreForPeriodSelection(data.period_rows, effectivePeriod, data.periods),
    [data.period_rows, data.periods, effectivePeriod]
  );

  return (
    <div className="stack health-score-stack">
      <section className="card advisor-hero">
        <div className="section-card-top">
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
          <SectionDetailToggle
            enabled={showDetails}
            onToggle={toggleDetails}
            label="Show details"
            title="Show or hide descriptions for each health score criterion"
          />
        </div>
        <div className="advisor-hero-grid advisor-hero-grid-wide">
          <ScoreHero score={healthScore.overall} label="Financial health score" />
          <div className="advisor-hero-details">
            <div className="health-factor-grid">
              <BreakdownBar
                label="Savings rate"
                explanationKey="Savings rate factor"
                score={healthScore.savings_rate_score}
                detail={healthScore.details[0]}
                icon="💰"
                showDetails={showDetails}
              />
              <BreakdownBar
                label="Income stability"
                explanationKey="Income stability factor"
                score={healthScore.income_stability_score}
                detail={healthScore.details[1]}
                icon="📊"
                showDetails={showDetails}
              />
              <BreakdownBar
                label="Expense stability"
                explanationKey="Expense stability factor"
                score={healthScore.expense_stability_score}
                detail={healthScore.details[2]}
                icon="📉"
                showDetails={showDetails}
              />
              <BreakdownBar
                label="Non-essential spending control"
                explanationKey="Non-essential control"
                score={healthScore.non_essential_score}
                detail={healthScore.details[3]}
                icon="🎯"
                showDetails={showDetails}
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
            {formatIncome(comparison.income_change)} ({formatPctChangeLabel(comparison.income_change_pct)})
          </strong>
        </div>
        <div className={`summary-pill ${comparison.expense_change <= 0 ? "good" : "bad"}`}>
          <span>Expenses</span>
          <strong>
            {comparison.expense_change >= 0 ? "+" : ""}
            {formatExpense(comparison.expense_change)} ({formatPctChangeLabel(comparison.expense_change_pct)})
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
