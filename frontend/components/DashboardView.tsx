"use client";

import { CategoryIcon } from "@/components/CategoryIcon";
import { PeriodSelect } from "@/components/PeriodSelect";
import { IncomeEntryPrompt } from "@/components/IncomeEntryPrompt";
import { formatCategoryDisplayName } from "@/lib/category-icons";
import { canonicalExpenseCategory } from "@/lib/category-normalize";
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

export function SimpleBarChart({
  data,
  colors,
  showCategoryIcons = false,
  showPercent = false,
  formatValue,
}: {
  data: { name: string; value: number }[];
  colors: string[];
  showCategoryIcons?: boolean;
  showPercent?: boolean;
  formatValue: (value: number) => string;
}) {
  const max = Math.max(...data.map((item) => item.value), 1);
  const total = data.reduce((sum, item) => sum + item.value, 0) || 1;
  return (
    <div className="simple-chart">
      {data.map((item, index) => (
        <div key={item.name} className="simple-chart-row">
          <div className="simple-chart-label">
            {showCategoryIcons && <CategoryIcon category={item.name} size={42} />}
            <span className="simple-chart-label-text">{formatCategoryDisplayName(item.name)}</span>
          </div>
          <div className="simple-chart-track">
            <div
              className="simple-chart-bar"
              style={{
                width: `${(item.value / max) * 100}%`,
                background: colors[index % colors.length],
              }}
            />
          </div>
          <div className="simple-chart-value">
            <span>{formatValue(item.value)}</span>
            {showPercent ? (
              <span className="simple-chart-pct">{((item.value / total) * 100).toFixed(1)}%</span>
            ) : null}
          </div>
        </div>
      ))}
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
  const expenseData = analysis.expense_categories.map((item) => ({
    name: item.category,
    value: item.total,
  }));

  const expenseBarData = expenseData.slice(0, 5).map((item) => ({
    name: canonicalExpenseCategory(item.name),
    value: item.value,
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
        <h3>{UI_LABELS.expensesByCategory}</h3>
        {expenseData.length === 0 ? (
          <p className="insight">No expenses recorded for this period.</p>
        ) : (
          <SimpleBarChart
            data={expenseBarData.length ? expenseBarData : expenseData}
            colors={["#1a6b7c", "#2d9cdb", "#7eb8c9", "#c9a227", "#2d6a4f"]}
            showCategoryIcons
            showPercent
            formatValue={formatExpense}
          />
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
