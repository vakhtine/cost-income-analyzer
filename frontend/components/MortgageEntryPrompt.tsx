"use client";

import { useEffect, useState } from "react";
import { appendEditableRowToPeriodRows } from "@/lib/categorization";
import { canonicalExpenseCategory } from "@/lib/category-normalize";
import { resolvePeriodForDate } from "@/lib/period-utils";
import { rebuildAnalyzeResponse } from "@/lib/rebuild";
import { AnalyzeResponse } from "@/lib/types";

export const MORTGAGE_CATEGORY = "Mortgage payment";

type Props = {
  data: AnalyzeResponse;
  periodLabel: string;
  periods?: string[];
  onUpdate: (data: AnalyzeResponse, savedPeriod?: string) => void;
  embedded?: boolean;
};

function hasMortgageInPeriod(data: AnalyzeResponse, periodLabel: string) {
  return (data.period_rows[periodLabel] ?? []).some(
    (row) =>
      row.transaction_type === "expense" &&
      canonicalExpenseCategory(row.category) === MORTGAGE_CATEGORY
  );
}

export function MortgageEntryPrompt({
  data,
  periodLabel,
  periods,
  onUpdate,
  embedded = false,
}: Props) {
  const availablePeriods = periods?.length ? periods : data.periods;
  const hasMortgage = hasMortgageInPeriod(data, periodLabel);
  const [wantsToAdd, setWantsToAdd] = useState<boolean | null>(hasMortgage ? true : null);
  const [entryPeriod, setEntryPeriod] = useState(
    periodLabel || (availablePeriods[availablePeriods.length - 1] ?? "")
  );
  const [lender, setLender] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (periodLabel && availablePeriods.includes(periodLabel)) {
      setEntryPeriod(periodLabel);
    }
  }, [periodLabel, availablePeriods]);

  if (!embedded && !hasMortgage && wantsToAdd === false) {
    return null;
  }

  function handleSave() {
    const parsedAmount = Number.parseFloat(amount);
    if (!lender.trim() || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return;
    }

    const nextId =
      Object.values(data.period_rows)
        .flat()
        .reduce((max, row) => Math.max(max, row.id), -1) + 1;

    const fallbackPeriod =
      entryPeriod || periodLabel || (availablePeriods[availablePeriods.length - 1] ?? "");
    const targetPeriod = date.trim()
      ? resolvePeriodForDate(date, availablePeriods, fallbackPeriod)
      : fallbackPeriod;

    const canonicalPeriods = data.upload_periods ?? data.periods;
    const next = appendEditableRowToPeriodRows(
      {
        id: nextId,
        merchant_name: lender.trim(),
        category: MORTGAGE_CATEGORY,
        amount: parsedAmount,
        date: date || "",
      },
      targetPeriod,
      data.period_rows,
      canonicalPeriods
    );

    onUpdate(rebuildAnalyzeResponse(next, canonicalPeriods), targetPeriod);
    setLender("");
    setAmount("");
    setDate("");
    setWantsToAdd(true);
    setStatus(
      `Added ${MORTGAGE_CATEGORY} from ${lender.trim()} to period ${targetPeriod}. You can add another payment below.`
    );
  }

  const heading = hasMortgage ? "Add another mortgage payment" : "Add a mortgage payment";
  const showForm = hasMortgage || wantsToAdd === true;

  return (
    <section className={embedded ? "mortgage-entry-prompt embedded" : "card mortgage-entry-prompt"}>
      {!embedded && <h3>{heading}</h3>}
      {embedded && <h4>{heading}</h4>}

      {!hasMortgage && (
        <p className="insight">
          Mortgage payments are tracked as a recurring expense category. Add yours if they are not
          already in your bank statement upload.
        </p>
      )}

      {!hasMortgage && wantsToAdd === null && (
        <div className="income-entry-actions">
          <button type="button" className="tab active" onClick={() => setWantsToAdd(true)}>
            Yes, add mortgage payment
          </button>
          <button type="button" className="tab" onClick={() => setWantsToAdd(false)}>
            Not now
          </button>
        </div>
      )}

      {showForm && (
        <div className="income-entry-form">
          <label>
            Lender / payee
            <input
              type="text"
              value={lender}
              onChange={(event) => setLender(event.target.value)}
              placeholder="e.g. Bank name, mortgage company"
            />
          </label>
          <label>
            Expenses category
            <input type="text" value={MORTGAGE_CATEGORY} readOnly />
          </label>
          <label>
            Period
            <select value={entryPeriod} onChange={(event) => setEntryPeriod(event.target.value)}>
              {availablePeriods.map((period) => (
                <option key={period} value={period}>
                  {period}
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
            Date (optional — overrides period if set)
            <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </label>
          <button type="button" className="tab active" onClick={handleSave}>
            Save mortgage payment
          </button>
        </div>
      )}

      {status && <p className="insight income-entry-status">{status}</p>}
    </section>
  );
}
