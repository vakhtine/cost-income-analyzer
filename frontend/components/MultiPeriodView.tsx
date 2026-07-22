import { AnalyzeResponse } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

export function MultiPeriodView({ data }: { data: AnalyzeResponse }) {
  return (
    <section className="card">
      <h3>Multi-period comparison</h3>
      <table>
        <thead>
          <tr>
            <th>Period</th>
            <th>Income</th>
            <th>Expenses</th>
            <th>Net Savings</th>
            <th>Savings Rate</th>
          </tr>
        </thead>
        <tbody>
          {data.periods.map((period) => {
            const item = data.period_analysis[period];
            return (
              <tr key={period}>
                <td>{period}</td>
                <td>{formatCurrency(item.total_income)}</td>
                <td>{formatCurrency(item.total_expenses)}</td>
                <td>{formatCurrency(item.net_savings)}</td>
                <td>{item.savings_rate.toFixed(1)}%</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
