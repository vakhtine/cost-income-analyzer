"use client";

import { CategoryIcon } from "@/components/CategoryIcon";
import { PeriodSelect } from "@/components/PeriodSelect";
import { IncomeEntryPrompt } from "@/components/IncomeEntryPrompt";
import { formatCategoryDisplayName } from "@/lib/category-icons";
import { top5ExpenseCategories } from "@/lib/analyzer";
import { isPersonToPersonCategory } from "@/lib/constants";
import { UI_LABELS } from "@/lib/ui-labels";
import { useCurrency } from "@/lib/currency-context";
import { AnalyzeResponse, PeriodAnalysis } from "@/lib/types";
type Props = {
  analysis: PeriodAnalysis;
  periods?: string[];
  selectedPeriod?: string;
  onPeriodChange?: (period: string) => void;
};

type InsightTone = "positive" | "warning" | "negative" | "info" | "alert";

function getInsightTone(insight: string, analysis: PeriodAnalysis): InsightTone {
  const lower = insight.toLowerCase();
  if (lower.includes("no income") || lower.includes("no expense") || lower.includes("exceed income")) {
    return "negative";
  }
  if (lower.includes("unusually high")) {
    return "alert";
  }
  if (lower.includes("healthy rate")) {
    return "positive";
  }
  if (lower.includes("consider targeting") || lower.includes("saving")) {
    return analysis.savings_rate >= 20 ? "positive" : "warning";
  }
  if (lower.includes("largest expense")) {
    return "info";
  }
  return "info";
}

function insightIcon(tone: InsightTone) {
  switch (tone) {
    case "positive":
      return "✓";
    case "warning":
      return "!";
    case "negative":
      return "✕";
    case "alert":
      return "⚠";
    default:
      return "◆";
  }
}

export function InsightsPanel({ analysis }: { analysis: PeriodAnalysis }) {
  if (!analysis.insights.length) return null;

  return (
    <section className="card insights-panel">
      <div className="insights-panel-header">
        <div className="insights-panel-badge">Insights</div>
        <h3>What stands out in your spending</h3>
        <p>Automated highlights based on your income, savings rate, and category patterns.</p>
      </div>
      <div className="insights-grid">
        {analysis.insights.map((insight, index) => {
          const tone = getInsightTone(insight, analysis);
          return (
            <article key={`${insight}-${index}`} className={`insight-card insight-${tone}`}>
              <div className="insight-card-icon" aria-hidden="true">
                {insightIcon(tone)}
              </div>
              <p className="insight-card-text">{insight}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}

type SimpleBarChartItem = {
  name: string;
  value: number;
  percent?: number;
};

export function SimpleBarChart({
  data,
  colors,
  showCategoryIcons = false,
  showPercent = false,
  barScale = "value",
  formatValue,
}: {
  data: SimpleBarChartItem[];
  colors: string[];
  showCategoryIcons?: boolean;
  showPercent?: boolean;
  barScale?: "value" | "percent";
  formatValue: (value: number) => string;
}) {
  const total = data.reduce((sum, item) => sum + item.value, 0) || 1;
  const barValues = data.map((item) =>
    barScale === "percent" ? (item.percent ?? 0) : item.value
  );
  const max = Math.max(...barValues, 1);

  return (
    <div className="simple-chart">
      {data.map((item, index) => {
        const barValue = barValues[index] ?? 0;
        const percentLabel =
          item.percent !== undefined
            ? item.percent
            : (item.value / total) * 100;

        return (
          <div key={item.name} className="simple-chart-row">
            <div className="simple-chart-label">
              {showCategoryIcons && <CategoryIcon category={item.name} size={42} />}
              <span className="simple-chart-label-text">
                {formatCategoryDisplayName(item.name)}
              </span>
            </div>
            <div className="simple-chart-track">
              <div
                className="simple-chart-bar"
                style={{
                  width: `${(barValue / max) * 100}%`,
                  background: colors[index % colors.length],
                }}
              />
            </div>
            <div className="simple-chart-value">
              <span>{formatValue(item.value)}</span>
              {showPercent ? (
                <span className="simple-chart-pct">{percentLabel.toFixed(1)}%</span>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function CategoryChartsPanel({
  analysis,
  data,
  periodLabel,
  periods,
  onUpdate,
}: {
  analysis: PeriodAnalysis;
  data: AnalyzeResponse;
  periodLabel: string;
  periods?: string[];
  onUpdate: (data: AnalyzeResponse, savedPeriod?: string) => void;
}) {
  const { formatIncome, formatExpense } = useCurrency();
  const incomeData = analysis.income_categories.map((item) => ({
    name: item.category,
    value: item.total,
  }));
  const expenseData = analysis.expense_categories
    .filter((item) => !isPersonToPersonCategory(item.category))
    .map((item) => ({
    name: item.category,
    value: item.total,
  }));

  const top5Categories = top5ExpenseCategories(analysis);
  const expenseBarData = top5Categories.map((item) => ({
    name: item.category,
    value: item.total,
    percent: item.pct_of_all_expenses,
  }));
  const incomePctBarData = top5Categories.map((item) => ({
    name: item.category,
    value: item.total,
    percent: item.pct_of_income_top5,
  }));

  return (
    <section className="grid-2 dashboard-charts-compact">
      <div className="card chart-card-compact income-chart-card">
        <h3>{UI_LABELS.incomeByCategory}</h3>
        <IncomeEntryPrompt
          data={data}
          periodLabel={periodLabel}
          periods={periods ?? data.periods}
          onUpdate={onUpdate}
          context="analyze"
          embedded
        />
        {incomeData.length === 0 ? (
          <p className="insight">No income recorded for this period yet.</p>
        ) : (
          <SimpleBarChart
            data={incomeData}
            colors={["#0F766E", "#14B8A6", "#5EEAD4", "#2DD4BF"]}
            showCategoryIcons
            formatValue={formatIncome}
          />
        )}
      </div>
      <div className="card chart-card-compact expense-bar-card">
        {expenseData.length === 0 ? (
          <>
            <h3>{UI_LABELS.expensesByCategory}</h3>
            <p className="insight">No expenses recorded for this period.</p>
          </>
        ) : (
          <div className="expense-charts-duo">
            <div className="expense-chart-panel">
              <h3>{UI_LABELS.expensesByCategory}</h3>
              <SimpleBarChart
                data={expenseBarData.length ? expenseBarData : expenseData}
                colors={["#1a6b7c", "#2d9cdb", "#7eb8c9", "#c9a227", "#2d6a4f"]}
                showCategoryIcons
                showPercent
                formatValue={formatExpense}
              />
            </div>
            <div className="expense-chart-panel">
              <h3>{UI_LABELS.top5ExpensesPctOfIncome}</h3>
              <SimpleBarChart
                data={incomePctBarData.length ? incomePctBarData : expenseData}
                colors={["#1a6b7c", "#2d9cdb", "#7eb8c9", "#c9a227", "#2d6a4f"]}
                showCategoryIcons
                showPercent
                barScale="percent"
                formatValue={formatExpense}
              />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export function DashboardView({
  analysis,
  periods,
  selectedPeriod,
  onPeriodChange,
}: Props) {
  const { formatIncome, formatExpense } = useCurrency();

  return (
    <>
      <section className="metrics">
        <div className="metric-card income">
          <div className="metric-label">Total Income</div>
          <div className="metric-value">{formatIncome(analysis.total_income)}</div>
        </div>
        <div className="metric-card expense">
          <div className="metric-label">Total Expenses</div>
          <div className="metric-value">{formatExpense(analysis.total_expenses)}</div>
        </div>
        <div className="metric-card savings">
          <div className="metric-label">Net Savings</div>
          <div className="metric-value">{formatIncome(analysis.net_savings)}</div>
        </div>
        <div className="metric-card rate">
          <div className="metric-label">Savings Rate</div>
          <div className="metric-value">{analysis.savings_rate.toFixed(1)}%</div>
        </div>
      </section>

      {periods?.length && selectedPeriod && onPeriodChange ? (
        <div className="period-details-header period-details-header-inline">
          <PeriodSelect periods={periods} value={selectedPeriod} onChange={onPeriodChange} />
        </div>
      ) : null}
    </>
  );
}
