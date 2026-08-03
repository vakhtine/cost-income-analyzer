"use client";

import { canonicalExpenseCategory } from "@/lib/category-normalize";
import { CategoryLabel } from "@/components/CategoryIcon";
import { PeriodSelect } from "@/components/PeriodSelect";
import { topMerchantsByCategoryMap } from "@/lib/category-merchants";
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
            Expenses category breakdown, month-over-month category trends, and outlier flags for
            the selected period.
          </p>
        </div>
      </div>

      <h4 className="analytics-subheading">{UI_LABELS.spendingByCategory}</h4>
      <p className="explanatory-callout metric-hint">
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
              <th className="pct-cell-center">% expenses</th>
              <th className="volatility-cell-center">Volatility (month to month, CV)</th>
            </tr>
          </thead>
          <tbody>
            {periodAnalysis.expense_categories.map((item) => {
              const categoryVolatility = volatilityByCategory.get(
                canonicalExpenseCategory(item.category)
              );
              return (
                <tr key={item.category}>
                  <td>
                    <CategoryLabel
                      category={item.category}
                      iconSize={42}
                      topMerchants={merchantsMap.get(canonicalExpenseCategory(item.category))}
                    />
                  </td>
                  <td>
                    <span className={`type-pill type-pill-${expenseSpendType(item.category).toLowerCase()}`}>
                      {expenseSpendType(item.category)}
                    </span>
                  </td>
                  <td>{formatExpense(item.total)}</td>
                  <td className="pct-cell-center">{item.pct_of_expenses?.toFixed(1) ?? "—"}%</td>
                  <td
                    className={`volatility-cell-center${
                      categoryVolatility &&
                      categoryVolatility.volatility_pct > 50 &&
                      categoryVolatility.avg_total >= 50
                        ? " metric-tone-negative"
                        : ""
                    }`}
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
                          topMerchants={merchantsMap.get(canonicalExpenseCategory(item.category))}
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

      {anomalies.anomalies.length ? (
        <>
          <h4 className="analytics-subheading">Anomaly flags</h4>
          <p className="explanatory-callout metric-hint">
            Flags merchant spending at least 10× the prior month&apos;s total for that expenses
            category{periodPair ? ` (${periodPair.priorPeriod} vs ${periodPair.currentPeriod})` : ""}.
          </p>
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
                        topMerchants={merchantsMap.get(canonicalExpenseCategory(item.category))}
                      />
                    </td>
                    <td>{formatExpense(item.amount)}</td>
                    <td className={item.multiplier >= 10 ? "metric-tone-negative" : undefined}>
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
      ) : null}
    </section>
  );
}
