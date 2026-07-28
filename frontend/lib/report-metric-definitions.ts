export type ReportMetricDefinition = {
  name: string;
  definition: string;
};

export const HEALTH_REPORT_METRICS: ReportMetricDefinition[] = [
  {
    name: "Financial health score",
    definition: "Overall score (0–100) from savings rate, income stability, and non-essential spending control.",
  },
  {
    name: "Savings rate",
    definition: "Share of income left after expenses in the selected period. Higher is better.",
  },
  {
    name: "HHI (expenses categories)",
    definition: "How concentrated your spending is across expenses categories. 0 = spread out; 1 = one category dominates.",
  },
  {
    name: "Top expenses category share",
    definition: "Percent of total expenses going to your largest expenses category.",
  },
  {
    name: "Expense volatility",
    definition: "Month-to-month swing in total expenses, measured as coefficient of variation across periods.",
  },
  {
    name: "Diversification score",
    definition: "How evenly spending is spread across expenses categories, derived from the HHI.",
  },
  {
    name: "Avg daily spend",
    definition: "Total expenses divided by the number of days with transactions in the period.",
  },
];

export const TREND_REPORT_METRICS: ReportMetricDefinition[] = [
  {
    name: "Expenses category volatility (CV)",
    definition: "Month-to-month variation for each expenses category. Higher % means less predictable spending.",
  },
  {
    name: "Anomaly flag",
    definition:
      "A merchant spend that is much higher than your own past spending in that expenses category — not a market or national average.",
  },
];

export function buildMetricDefinitionsHtml(definitions: ReportMetricDefinition[]): string {
  const rows = definitions
    .map(
      (item) =>
        `<tr><td><strong>${item.name}</strong></td><td>${item.definition}</td></tr>`
    )
    .join("");

  return `
    <div class="section-block">
      <h2 class="section-title">What these metrics mean</h2>
      <table class="index-table metric-definitions-table">
        <thead><tr><th>Metric</th><th>Definition</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}
