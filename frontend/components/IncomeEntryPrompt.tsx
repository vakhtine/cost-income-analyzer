"use client";

import { useState } from "react";
import { appendEditableRowToPeriodRows } from "@/lib/categorization";
import { rebuildAnalyzeResponse } from "@/lib/rebuild";
import { AnalyzeResponse } from "@/lib/types";

const INCOME_TYPES = [
  "Salary",
  "Pension",
  "Investment Income",
  "Bonus",
  "Rental Income",
  "Other Income",
];

type Props = {
  data: AnalyzeResponse;
  periodLabel: string;
  onUpdate: (data: AnalyzeResponse) => void;
  context?: "clean" | "analyze";
  embedded?: boolean;
};

function hasAnyIncome(data: AnalyzeResponse) {
  return Object.values(data.period_rows)
    .flat()
    .some((row) => row.transaction_type === "income" && row.abs_amount > 0);
}

function hasIncomeInPeriod(data: AnalyzeResponse, periodLabel: string) {
  return (data.period_rows[periodLabel] ?? []).some(
    (row) => row.transaction_type === "income" && row.abs_amount > 0
  );
}

export function IncomeEntryPrompt({
  data,
  periodLabel,
  onUpdate,
  context = "analyze",
  embedded = false,
}: Props) {
  const hasIncome =
    context === "clean" ? hasAnyIncome(data) : hasIncomeInPeriod(data, periodLabel);
  const [wantsToAdd, setWantsToAdd] = useState<boolean | null>(hasIncome ? true : null);
  const [merchant, setMerchant] = useState("");
  const [incomeType, setIncomeType] = useState(INCOME_TYPES[0]);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [status, setStatus] = useState("");

  if (!embedded && !hasIncome && wantsToAdd === false) {
    return null;
  }

  function handleSave() {
    const parsedAmount = Number.parseFloat(amount);
    if (!merchant.trim() || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return;
    }

    const nextId =
      Object.values(data.period_rows)
        .flat()
        .reduce((max, row) => Math.max(max, row.id), -1) + 1;
    const category = incomeType;

    const next = appendEditableRowToPeriodRows(
      {
        id: nextId,
        merchant_name: merchant.trim(),
        category,
        amount: parsedAmount,
        date: date || "",
      },
      periodLabel,
      data.period_rows
    );

    onUpdate(rebuildAnalyzeResponse(next));
    setMerchant("");
    setAmount("");
    setDate("");
    setWantsToAdd(true);
    setStatus(`Added ${incomeType} from ${merchant.trim()}. You can add another income stream below.`);
  }

  const heading = hasIncome
    ? "Add another income stream"
    : context === "clean"
      ? "No income detected in your upload"
      : "No income in this period";

  const showForm = hasIncome || wantsToAdd === true;

  return (
    <section className={embedded ? "income-entry-prompt embedded" : "card income-entry-prompt"}>
      {!embedded && <h3>{heading}</h3>}
      {embedded && <h4>{heading}</h4>}

      {!hasIncome && (
        <p className="insight">
          We did not find any income in your CSV or manual entries. Income helps calculate savings
          rate, health score, and relocation affordability. Would you like to add income now?
        </p>
      )}

      {!hasIncome && wantsToAdd === null && (
        <div className="income-entry-actions">
          <button type="button" className="tab active" onClick={() => setWantsToAdd(true)}>
            Yes, add income
          </button>
          <button type="button" className="tab" onClick={() => setWantsToAdd(false)}>
            Not now
          </button>
        </div>
      )}

      {hasIncome && !showForm && (
        <button type="button" className="tab active" onClick={() => setWantsToAdd(true)}>
          Add income
        </button>
      )}

      {showForm && (
        <div className="income-entry-form">
          <label>
            Merchant / source
            <input
              type="text"
              value={merchant}
              onChange={(event) => setMerchant(event.target.value)}
              placeholder="e.g. Employer, Client, Pension fund"
            />
          </label>
          <label>
            Type of income
            <select value={incomeType} onChange={(event) => setIncomeType(event.target.value)}>
              {INCOME_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>
          <label>
            Amount
            <input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="0.00"
            />
          </label>
          <label>
            Date
            <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </label>
          <button type="button" className="tab active" onClick={handleSave}>
            Save income
          </button>
        </div>
      )}

      {status && <p className="insight income-entry-status">{status}</p>}
    </section>
  );
}
