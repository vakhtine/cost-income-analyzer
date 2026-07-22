"use client";

import { CategoryIcon } from "@/components/CategoryIcon";
import { IncomeEntryPrompt } from "@/components/IncomeEntryPrompt";
import { formatCategoryDisplayName } from "@/lib/category-icons";
import { useCurrency } from "@/lib/currency-context";
import { AnalyzeResponse, PeriodAnalysis } from "@/lib/types";
type Props = {
  analysis: PeriodAnalysis;
  showCharts?: boolean;
  data?: AnalyzeResponse;
  periodLabel?: string;
  onUpdate?: (data: AnalyzeResponse) => void;
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
  formatValue,
}: {
  data: { name: string; value: number }[];
  colors: string[];
  showCategoryIcons?: boolean;
  formatValue: (value: number) => string;
}) {
  const max = Math.max(...data.map((item) => item.value), 1);
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
          <div className="simple-chart-value">{formatValue(item.value)}</div>        </div>
      ))}
    </div>
  );
}

export function DashboardView({
  analysis,
  showCharts = true,
  data,
  periodLabel,
  onUpdate,
}: Props) {
  const { formatIncome, formatExpense } = useCurrency();
  const incomeData = analysis.income_categories.map((item) => ({
    name: item.category,
    value: item.total,
  }));
  const expenseData = analysis.expense_categories.map((item) => ({
    name: item.category,
    value: item.total,
  }));

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
          <div className="metric-value">{formatIncome(analysis.net_savings)}</div>        </div>
        <div className="metric-card rate">
          <div className="metric-label">Savings Rate</div>
          <div className="metric-value">{analysis.savings_rate.toFixed(1)}%</div>
        </div>
      </section>

      {showCharts && (
        <section className="grid-2">
          <div className="card">
            <h3>Income by category</h3>
            {data && periodLabel && onUpdate && (
              <IncomeEntryPrompt
                data={data}
                periodLabel={periodLabel}
                onUpdate={onUpdate}
                context="analyze"
                embedded
              />
            )}
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
          <div className="card">
            <h3>Expenses by category</h3>
            <SimpleBarChart
              data={expenseData}
              colors={["#F59E0B", "#F97316", "#EF4444", "#8B5CF6", "#6366F1"]}
              showCategoryIcons
              formatValue={formatExpense}
            />          </div>
        </section>
      )}

      <section className="card">
        <h3>Category breakdown</h3>
        <table>
          <thead>
            <tr>
              <th>Category</th>
              <th>Total</th>
              <th>% out of total income</th>
              <th>% out of total expenses</th>
            </tr>
          </thead>
          <tbody>
            {analysis.expense_categories.map((item) => (
              <tr key={item.category}>
                <td>
                  <span className="category-label-with-icon">
                    <CategoryIcon category={item.category} size={64} className="category-icon-breakdown" />
                    {formatCategoryDisplayName(item.category)}
                  </span>
                </td>
                <td>{formatExpense(item.total)}</td>                <td>{item.pct_of_income.toFixed(1)}%</td>
                <td>{item.pct_of_expenses?.toFixed(1) ?? "-"}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
