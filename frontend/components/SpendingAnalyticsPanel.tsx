"use client";

import { CategoryLabel } from "@/components/CategoryIcon";
import { PeriodSelect } from "@/components/PeriodSelect";
import { topMerchantsByCategoryMap } from "@/lib/category-merchants";
import { HEALTH_SCORE_METHODOLOGY } from "@/lib/health-score";
import {
  categoryTrendChangeTone,
} from "@/lib/metric-tones";
import { useMemo } from "react";
import { analyzeTransactions } from "@/lib/analyzer";
import { useCurrency } from "@/lib/currency-context";
import {
  AVERAGE_PERIOD_LABEL,
  analyzeAveragePeriods,
  analyzeCombinedPeriods,
  healthScoreForPeriodSelection,
} from "@/lib/rebuild";
import {
  adjacentPeriodPair,
  computeCategoryTrends,
  computeCategoryVolatility,
  computeHerfindahlIndex,
  computePeriodExpenseTrends,
  detectAnomalies,
  expenseSpendType,
} from "@/lib/spending-metrics";
import { UI_LABELS } from "@/lib/ui-labels";
import { AnalyzeResponse } from "@/lib/types";

type Props = {
  data: AnalyzeResponse;
  selectedPeriod: string;
  onPeriodChange: (period: string) => void;
};

function trendLabel(trend: string, changePct: number) {
  if (trend === "Spike" || changePct >= 50) return `+${changePct.toFixed(1)}% ▲ ${trend}`;
  if (changePct > 5) return `+${changePct.toFixed(1)}% ▲ Up`;
  if (changePct < -5) return `${changePct.toFixed(1)}% ▼ Down`;
  return `${changePct.toFixed(1)}% ▬ Stable`;
}

export function SpendingAnalyticsPanel({ data, selectedPeriod, onPeriodChange }: Props) {
  const { formatExpense } = useCurrency();
  const effectivePeriod = selectedPeriod || data.periods[data.periods.length - 1] || "";
  const isAllPeriods = effectivePeriod === "All periods";
  const isAveragePeriod = effectivePeriod === AVERAGE_PERIOD_LABEL;

  const periodAnalysis = useMemo(() => {
    if (isAllPeriods) return analyzeCombinedPeriods(data.period_rows);
    if (isAveragePeriod) return analyzeAveragePeriods(data.period_rows);
    return analyzeTransactions(data.period_rows[effectivePeriod] ?? []);
  }, [data.period_rows, effectivePeriod, isAllPeriods, isAveragePeriod]);

  const focusPeriod = isAllPeriods || isAveragePeriod
    ? data.periods[data.periods.length - 1]
    : effectivePeriod;

  const healthScore = useMemo(
    () => healthScoreForPeriodSelection(data.period_rows, effectivePeriod, data.periods),
    [data.period_rows, data.periods, effectivePeriod]
  );

  const concentration = useMemo(() => {
    if (!periodAnalysis) return null;
    return computeHerfindahlIndex(
      periodAnalysis.expense_categories,
      periodAnalysis.total_expenses
    );
  }, [periodAnalysis]);

  const trends = useMemo(
    () => computeCategoryTrends(data.period_rows, data.periods, focusPeriod),
    [data.period_rows, data.periods, focusPeriod]
  );

  const volatility = useMemo(
    () => computeCategoryVolatility(data.period_rows, data.periods),
    [data.period_rows, data.periods]
  );

  const volatilityByCategory = useMemo(() => {
    const map = new Map<string, (typeof volatility)[number]>();
    for (const item of volatility) {
      map.set(item.category, item);
    }
    return map;
  }, [volatility]);

  const anomalies = useMemo(
    () => detectAnomalies(data.period_rows, data.periods, focusPeriod),
    [data.period_rows, data.periods, focusPeriod]
  );

  const periodTrends = useMemo(
    () => computePeriodExpenseTrends(data.period_rows, data.periods),
    [data.period_rows, data.periods]
  );

  const periodPair = adjacentPeriodPair(data.periods, focusPeriod);

  const merchantSourceRows = useMemo(() => {
    if (isAllPeriods || isAveragePeriod) {
      return Object.values(data.period_rows).flat();
    }
    return data.period_rows[effectivePeriod] ?? [];
  }, [data.period_rows, effectivePeriod, isAllPeriods, isAveragePeriod]);

  const merchantsMap = useMemo(
    () => topMerchantsByCategoryMap(merchantSourceRows),
    [merchantSourceRows]
  );

  if (!periodAnalysis || !healthScore.metrics) return null;

  return (
    <section className="card trend-anomaly-panel">
      <div className="section-heading section-heading-with-period">
        <PeriodSelect
          periods={data.periods}
          value={effectivePeriod}
          onChange={onPeriodChange}
        />
        <div className="section-heading-content">
          <h3>Trend &amp; anomaly view</h3>
          <p>
            Expenses category breakdown, concentration, period-over-period changes, month-to-month
            volatility, and outlier flags for the selected period.
          </p>
        </div>
      </div>

      {concentration && (
        <>
          <div className="health-metrics-grid">
            <div className="health-metric-card">
              <span>Concentration index (HHI, expenses categories)</span>
              <strong title={HEALTH_SCORE_METHODOLOGY.expense_concentration}>
                {concentration.hhi.toFixed(2)} / 1.0
              </strong>
            </div>
            <div className="health-metric-card">
              <span>{UI_LABELS.topExpensesCategoryShare}</span>
              <strong>{concentration.top_category_share_pct.toFixed(1)}%</strong>
            </div>
            <div className="health-metric-card">
              <span>{UI_LABELS.categoriesTracked}</span>
              <strong>{concentration.category_count}</strong>
            </div>
          </div>
          <p className="insight">{concentration.interpretation}</p>
        </>
      )}

      <h4 className="analytics-subheading">{UI_LABELS.spendingByCategory}</h4>
      <p className="insight metric-hint">
        Volatility shows month-to-month variation for each expenses category (coefficient of
        variation across periods).
      </p>
      <div className="table-scroll">
        <table className="category-matrix-table">
          <thead>
            <tr>
              <th>{UI_LABELS.expensesCategory}</th>
              <th>Type</th>
              <th>Total</th>
              <th>% expenses</th>
              <th>Volatility (month to month, CV)</th>
            </tr>
          </thead>
          <tbody>
            {periodAnalysis.expense_categories.map((item) => {
              const categoryVolatility = volatilityByCategory.get(item.category);
              return (
                <tr key={item.category}>
                  <td>
                    <CategoryLabel
                      category={item.category}
                      iconSize={42}
                      topMerchants={merchantsMap.get(item.category)}
                    />
                  </td>
                  <td>
                    <span className={`type-pill type-pill-${expenseSpendType(item.category).toLowerCase()}`}>
                      {expenseSpendType(item.category)}
                    </span>
                  </td>
                  <td>{formatExpense(item.total)}</td>
                  <td>{item.pct_of_expenses?.toFixed(1) ?? "—"}%</td>
                  <td
                    className={
                      categoryVolatility &&
                      categoryVolatility.volatility_pct > 50 &&
                      categoryVolatility.avg_total >= 50
                        ? "metric-tone-negative"
                        : undefined
                    }
                  >
                    {categoryVolatility
                      ? `${categoryVolatility.volatility_pct.toFixed(1)}%`
                      : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {data.periods.length >= 2 ? (
        <>
          <h4 className="analytics-subheading">Period-over-period expenses</h4>
          <div className="table-scroll">
            <table className="category-matrix-table">
              <thead>
                <tr>
                  <th>Period</th>
                  <th>Total expenses</th>
                  <th>Change</th>
                </tr>
              </thead>
              <tbody>
                {periodTrends.map((item) => (
                  <tr key={item.period}>
                    <td>{item.period}</td>
                    <td>{formatExpense(item.total_expenses)}</td>
                    <td>
                      {item.change_pct !== null
                        ? `${item.change_pct >= 0 ? "+" : ""}${item.change_pct.toFixed(1)}%`
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <p className="insight">
          Upload more than one month to unlock period-over-period trends.
        </p>
      )}

      {trends?.length ? (
        <>
          <h4 className="analytics-subheading">
            {UI_LABELS.categoryTrend}
            {periodPair
              ? ` — ${periodPair.currentPeriod} vs ${periodPair.priorPeriod}`
              : ""}
          </h4>
          <div className="table-scroll">
            <table className="category-matrix-table">
              <thead>
                <tr>
                  <th>{UI_LABELS.expensesCategory}</th>
                  <th>
                    This period
                    {periodPair ? ` (${periodPair.currentPeriod})` : ""}
                  </th>
                  <th>
                    Prior period
                    {periodPair ? ` (${periodPair.priorPeriod})` : ""}
                  </th>
                  <th>Change</th>
                </tr>
              </thead>
              <tbody>
                {trends.slice(0, 8).map((item) => {
                  const changeTone = categoryTrendChangeTone(
                    item.current_total,
                    item.prior_total,
                    item.change_pct
                  );
                  return (
                    <tr key={item.category}>
                      <td>
                        <CategoryLabel
                          category={item.category}
                          iconSize={42}
                          topMerchants={merchantsMap.get(item.category)}
                        />
                      </td>
                      <td>{formatExpense(item.current_total)}</td>
                      <td>{formatExpense(item.prior_total)}</td>
                      <td className={changeTone ? `metric-tone-${changeTone}` : undefined}>
                        {trendLabel(item.trend, item.change_pct)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      ) : null}

      {volatility.length ? (
        <>
          <h4 className="analytics-subheading">{UI_LABELS.expenseCategoryVolatility}</h4>
          <p className="insight metric-hint">
            How much each expenses category swings from month to month. Higher % = less predictable
            spending.
          </p>
          <div className="table-scroll">
            <table className="category-matrix-table">
              <thead>
                <tr>
                  <th>{UI_LABELS.expensesCategory}</th>
                  <th>Volatility (month to month, CV)</th>
                  <th>Avg monthly spend</th>
                </tr>
              </thead>
              <tbody>
                {volatility.slice(0, 6).map((item) => (
                  <tr key={item.category}>
                    <td>
                      <CategoryLabel
                        category={item.category}
                        iconSize={42}
                        topMerchants={merchantsMap.get(item.category)}
                      />
                    </td>
                    <td>{item.volatility_pct.toFixed(1)}%</td>
                    <td>{formatExpense(item.avg_total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}

      <h4 className="analytics-subheading">Anomaly flags</h4>
      <p className="insight metric-hint">
        Flags compare merchant spending to your own past months in that expenses category — not
        external or market averages.
      </p>
      {anomalies.anomalies.length ? (
        <>
          <div className="table-scroll">
            <table className="category-matrix-table">
              <thead>
                <tr>
                  <th>Merchant</th>
                  <th>{UI_LABELS.expensesCategory}</th>
                  <th>Amount</th>
                  <th>Flag</th>
                </tr>
              </thead>
              <tbody>
                {anomalies.anomalies.slice(0, 6).map((item) => (
                  <tr key={`${item.merchant_name}-${item.category}`}>
                    <td>
                      {item.merchant_name}
                      {item.transaction_count > 1 ? ` (${item.transaction_count} txns)` : ""}
                    </td>
                    <td>
                      <CategoryLabel
                        category={item.category}
                        iconSize={42}
                        topMerchants={merchantsMap.get(item.category)}
                      />
                    </td>
                    <td>{formatExpense(item.amount)}</td>
                    <td className={item.multiplier >= 4 ? "metric-tone-negative" : undefined}>
                      {item.description}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="insight">
            {anomalies.anomalies.length} anomal
            {anomalies.anomalies.length === 1 ? "y" : "ies"} detected out of{" "}
            {anomalies.total_transactions} transactions.
          </p>
        </>
      ) : (
        <p className="insight">No statistical outliers detected for this period.</p>
      )}
    </section>
  );
}
