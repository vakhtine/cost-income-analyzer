"use client";

import { CategoryChange } from "@/lib/types";
import { CategoryIcon } from "@/components/CategoryIcon";
import { useCurrency } from "@/lib/currency-context";

type Props = {
  change: CategoryChange;
};

export function CategoryChangeCard({ change }: Props) {
  const { formatIncome, formatExpense, formatDisplay } = useCurrency();
  const formatAmount =
    change.transaction_type === "income"
      ? formatIncome
      : change.transaction_type === "transfer"
        ? formatDisplay
        : formatExpense;
  const isIncrease = change.change_amount > 0;
  const isExpense = change.transaction_type === "expense";
  const isTransfer = change.transaction_type === "transfer";
  const isBad = isTransfer ? false : isExpense ? isIncrease : !isIncrease;
  const maxTotal = Math.max(change.previous_total, change.current_total, 1);
  const drivers = change.top_drivers.slice(0, 3);

  return (
    <article className={`change-card ${isBad ? "change-bad" : "change-good"}`}>
      <div className="change-card-header">
        <div className="change-card-title">
          <CategoryIcon category={change.category} size={60} className="category-icon-change-card" />
          <div>
            <div className="change-category">{change.category}</div>
            <div className="change-type">{change.transaction_type}</div>
          </div>
        </div>
        <div className={`change-badge ${isIncrease ? "up" : "down"}`}>
          {isIncrease ? "▲" : "▼"} {Math.abs(change.change_pct).toFixed(1)}%
        </div>
      </div>

      <div className="change-amounts">
        <span>{formatAmount(change.previous_total)}</span>
        <span className="change-arrow">→</span>
        <span className="change-current">{formatAmount(change.current_total)}</span>
        <span className={`change-delta ${isIncrease ? "positive" : "negative"}`}>
          {isIncrease ? "+" : "-"}
          {formatAmount(Math.abs(change.change_amount))}
        </span>
      </div>

      <div className="change-bars">
        <div className="change-bar-row">
          <span>Before</span>
          <div className="change-bar-track">
            <div
              className="change-bar before"
              style={{ width: `${(change.previous_total / maxTotal) * 100}%` }}
            />
          </div>
        </div>
        <div className="change-bar-row">
          <span>After</span>
          <div className="change-bar-track">
            <div
              className={`change-bar after ${isBad ? "bad" : "good"}`}
              style={{ width: `${(change.current_total / maxTotal) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {drivers.length > 0 && (
        <div className="change-drivers">
          <span className="change-drivers-label">Primary explanation (top {drivers.length})</span>
          <ol className="driver-list">
            {drivers.map((driver) => (
              <li key={driver.merchant_name} className="driver-list-item">
                <strong>{driver.merchant_name}</strong>
                <span className={`driver-chip ${driver.delta >= 0 ? "chip-up" : "chip-down"}`}>
                  {driver.delta >= 0 ? "+" : "-"}
                  {formatAmount(Math.abs(driver.delta))} change
                </span>
                <span className="driver-txn">
                  Largest transaction: {formatAmount(driver.transaction_amount)}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </article>
  );
}
