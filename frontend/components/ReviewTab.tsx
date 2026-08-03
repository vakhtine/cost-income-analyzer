"use client";



import { useEffect, useMemo, useRef, useState } from "react";

import { AnalyzeResponse, CategorizationFlag } from "@/lib/types";

import {

  applyFlagFixes,

  applyUnknownAssignments,

  collectAllActionableFlagFixes,

  collectFlagFixes,

  editableToTransactions,

  getAllUsedCategories,
  getKnownExpenseCategories,
  getExpenseCategoryOptions,
  getMerchantCategoryOptions,
  getPeriodsWithUnknownTransactions,
  getUnknownMerchants,

  mergeEditableRowsIntoPeriodRows,

  rowsToEditable,

} from "@/lib/categorization";

import { resolvePeriodForDate } from "@/lib/period-utils";

import { resolveTransactionType, TRANSFER_CATEGORY_LABEL } from "@/lib/constants";
import { UI_LABELS } from "@/lib/ui-labels";

import { rebuildAnalyzeResponse } from "@/lib/rebuild";

import { formatCurrency } from "@/lib/utils";



type EditableRow = {

  id: number;

  merchant_name: string;

  category: string;

  amount: number;

  date: string;

};



type SaveStatus = {

  kind: "success" | "error" | "info";

  message: string;

  detail?: string;

};



type Props = {

  data: AnalyzeResponse;

  onUpdate: (data: AnalyzeResponse) => void;

  showUnknownSection?: boolean;

  showEditorSection?: boolean;

};



const INCOME_CATEGORY_OPTIONS = [

  "Salary",

  "Pension",

  "Investment Income",

  "Bonus",

  "Rental Income",

  "Other Income",

];



function isActionableFlag(flag: CategorizationFlag) {

  return (

    flag.suggested_category.trim().toLowerCase() !==

    flag.current_category.trim().toLowerCase()

  );

}



function countRowTypes(rows: { category: string }[]) {
  let income = 0;
  let expense = 0;
  let transfer = 0;

  for (const row of rows) {
    const categoryLower = row.category.trim().toLowerCase();
    if (!categoryLower) continue;
    const type = resolveTransactionType(row.category);
    if (type === "income") income += 1;
    else if (type === "transfer") transfer += 1;
    else expense += 1;
  }

  return { income, expense, transfer, total: income + expense + transfer };
}



export function ReviewTab({ data, onUpdate, showUnknownSection = true, showEditorSection = true }: Props) {

  const [editPeriod, setEditPeriod] = useState(data.periods[data.periods.length - 1]);

  const [editableRows, setEditableRows] = useState<EditableRow[]>([]);

  const [editorLoaded, setEditorLoaded] = useState(false);

  const [unknownAssignments, setUnknownAssignments] = useState<Record<string, string>>({});

  const [flagDecisions, setFlagDecisions] = useState<Record<string, "keep" | "change">>({});

  const [statusMessage, setStatusMessage] = useState<SaveStatus | null>(null);

  const [savePulse, setSavePulse] = useState(false);

  const saveNoticeRef = useRef<HTMLDivElement | null>(null);



  useEffect(() => {

    if (!data.periods.includes(editPeriod)) {

      setEditPeriod(data.periods[data.periods.length - 1]);

    }

  }, [data.periods, editPeriod]);



  const allRows = useMemo(

    () => Object.values(data.period_rows).flat(),

    [data.period_rows]

  );

  const periodRows = data.period_rows[editPeriod] ?? [];

  const knownCategories = useMemo(() => getKnownExpenseCategories(allRows), [allRows]);

  const allCategories = useMemo(() => getAllUsedCategories(allRows), [allRows]);

  const merchantCategoryOptions = useMemo(
    () => getMerchantCategoryOptions(allRows),
    [allRows]
  );

  const expenseCategoryOptions = useMemo(
    () => getExpenseCategoryOptions(allRows),
    [allRows]
  );

  const unknownMerchants = useMemo(() => getUnknownMerchants(periodRows), [periodRows]);
  const periodsWithUnknowns = useMemo(
    () => getPeriodsWithUnknownTransactions(data.period_rows, data.periods),
    [data.period_rows, data.periods]
  );

  const actionableFlags = useMemo(

    () => data.categorization_flags.filter(isActionableFlag),

    [data.categorization_flags]

  );



  useEffect(() => {
    setEditableRows(rowsToEditable(data.period_rows[editPeriod] ?? []) as EditableRow[]);
    setEditorLoaded(true);
  }, [editPeriod, data.period_rows]);

  function reloadEditor() {
    setEditableRows(rowsToEditable(data.period_rows[editPeriod] ?? []) as EditableRow[]);
    setEditorLoaded(true);
    setStatusMessage(null);
  }



  useEffect(() => {

    if (!savePulse) return;

    saveNoticeRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });

    const timer = window.setTimeout(() => setSavePulse(false), 5000);

    return () => window.clearTimeout(timer);

  }, [savePulse]);



  function showStatus(status: SaveStatus) {

    setStatusMessage(status);

    if (status.kind === "success") {

      setSavePulse(true);

    }

  }



  function saveEditor() {

    const incompleteRows = editableRows.filter(

      (row) => !row.merchant_name.trim() || !row.category.trim() || row.amount === 0

    );



    if (!editableRows.length) {

      showStatus({

        kind: "error",

        message: "Nothing to save.",

        detail: "Add at least one row with merchant, category, and a non-zero amount.",

      });

      return;

    }



    if (incompleteRows.length === editableRows.length) {

      showStatus({

        kind: "error",

        message: "Rows are incomplete.",

        detail:

          "Each row needs a merchant name, category, and amount greater than zero before saving.",

      });

      return;

    }



    const validRows = editableRows.filter(

      (row) => row.merchant_name.trim() && row.category.trim() && row.amount !== 0

    );

    if (!validRows.length) {

      showStatus({

        kind: "error",

        message: "No valid rows to save.",

        detail: "Check that merchant, category, and amount are filled in on each row.",

      });

      return;

    }



    const canonicalPeriods = data.upload_periods ?? data.periods;
    const next = mergeEditableRowsIntoPeriodRows(
      editableRows,
      editPeriod,
      data.period_rows,
      canonicalPeriods
    );

    const rebuilt = rebuildAnalyzeResponse(next, canonicalPeriods);

    onUpdate(rebuilt);



    const savedRows = rebuilt.period_rows[editPeriod] ?? [];

    setEditableRows(rowsToEditable(savedRows) as EditableRow[]);

    setEditorLoaded(true);



    const counts = countRowTypes(validRows);
    const skipped = editableRows.length - validRows.length;

    const analysis = rebuilt.period_analysis[editPeriod];

    const routedPeriods = [...new Set(

      validRows

        .filter((row) => row.date.trim())

        .map((row) => resolvePeriodForDate(row.date, rebuilt.periods, editPeriod))

        .filter((period) => period !== editPeriod)

    )];



    showStatus({

      kind: "success",

      message: `Saved changes for ${editPeriod}.`,

      detail: `${counts.total} record${counts.total === 1 ? "" : "s"} saved (${counts.income} income, ${counts.expense} expense${counts.transfer ? `, ${counts.transfer} transfer` : ""}). Income ${formatCurrency(analysis?.total_income ?? 0)}, expenses ${formatCurrency(analysis?.total_expenses ?? 0)}.${skipped > 0 ? ` ${skipped} incomplete row${skipped === 1 ? " was" : "s were"} skipped.` : ""}${routedPeriods.length ? ` Rows with dates in ${routedPeriods.join(", ")} were assigned to those periods.` : ""} Dashboard and relocation analysis updated.`,

    });

  }



  function applyUnknown() {
    const pending = Object.entries(unknownAssignments).filter(([, category]) => category.trim());
    if (!pending.length) {
      showStatus({
        kind: "info",
        message: "Select an expenses category for at least one merchant before applying.",
      });
      return;
    }

    const updated = applyUnknownAssignments(periodRows, unknownAssignments);

    const next = { ...data.period_rows, [editPeriod]: updated };

    const canonicalPeriods = data.upload_periods ?? data.periods;
    onUpdate(rebuildAnalyzeResponse(next, canonicalPeriods));

    setUnknownAssignments({});

    showStatus({

      kind: "success",

      message: `Updated unknown merchants in ${editPeriod}.`,

    });

  }



  function applyFlags(flags: CategorizationFlag[]) {

    const fixes = collectFlagFixes(flags, flagDecisions);

    if (!fixes.length) {

      showStatus({

        kind: "info",

        message:

          "No changes to apply. Suggestions are applied by default — use Keep current to skip specific items.",

      });

      return;

    }

    const next = applyFlagFixes(data.period_rows, fixes);

    const canonicalPeriods = data.upload_periods ?? data.periods;
    const rebuilt = rebuildAnalyzeResponse(next, canonicalPeriods);

    onUpdate(rebuilt);

    setFlagDecisions({});

    showStatus({

      kind: "success",

      message: `Applied ${fixes.length} categorization ${fixes.length === 1 ? "fix" : "fixes"}.`,

      detail: `${rebuilt.categorization_flags.length} review items remaining.`,

    });

  }



  function applyAllSuggestions() {

    const fixes = collectAllActionableFlagFixes(actionableFlags);

    if (!fixes.length) {

      showStatus({

        kind: "info",

        message: "No actionable suggestions found.",

      });

      return;

    }

    const next = applyFlagFixes(data.period_rows, fixes);

    const canonicalPeriods = data.upload_periods ?? data.periods;
    const rebuilt = rebuildAnalyzeResponse(next, canonicalPeriods);

    onUpdate(rebuilt);

    setFlagDecisions({});

    showStatus({

      kind: "success",

      message: `Applied all ${fixes.length} AI suggestions.`,

      detail: `${rebuilt.categorization_flags.length} review items remaining.`,

    });

  }



  function updateRow(index: number, field: keyof EditableRow, value: string | number) {

    setEditableRows((rows) =>

      rows.map((row, i) => (i === index ? { ...row, [field]: value } : row))

    );

    setStatusMessage(null);

  }



  function addRow() {

    setEditableRows((rows) => [

      ...rows,

      {

        id: rows.length,

        merchant_name: "",

        category: allCategories[0] ?? "",

        amount: 0,

        date: "",

      },

    ]);

    setEditorLoaded(true);

    setStatusMessage(null);

  }



  function removeRow(index: number) {

    setEditableRows((rows) => rows.filter((_, i) => i !== index));

    setStatusMessage(null);

  }



  return (

    <div className="stack">

      {statusMessage && (

        <div

          className={`save-notice global ${statusMessage.kind} ${savePulse ? "pulse" : ""}`}

        >

          <strong>{statusMessage.message}</strong>

          {statusMessage.detail && <p>{statusMessage.detail}</p>}

        </div>

      )}



      {showUnknownSection && (

      <section className="card">

        <h3>Categorize unknown or uncategorized merchants</h3>

        {!showEditorSection && (
          <div className="form-row">
            <label className="review-period-label">
              Period
              <select value={editPeriod} onChange={(event) => setEditPeriod(event.target.value)}>
                {data.periods.map((period) => (
                  <option key={period} value={period}>
                    {period}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}

        <p className="transfer-category-note">
          Use <strong>{TRANSFER_CATEGORY_LABEL}</strong> for money moved between your own accounts
          (for example, paying a credit card from checking). Transfers are{" "}
          <strong>not counted as income or expenses</strong> — the real spending is already captured
          on the card or account you paid.
        </p>

        <div className="unknown-merchant-alert">
          <p>
            Assign unknown merchants to an expenses category from the list below, or choose Transfer.
          </p>

          {periodsWithUnknowns.length > 0 ? (
            <p className="insight">
              Unknown or uncategorized transactions found in:{" "}
              <strong>{periodsWithUnknowns.join(", ")}</strong>
              {periodsWithUnknowns.length > 1
                ? `. Select each period above to categorize its merchants.`
                : "."}
            </p>
          ) : (
            <p className="insight">No unknown merchants in any period.</p>
          )}
        </div>

        {unknownMerchants.length === 0 ? (

          <p>No unknown merchants in {editPeriod}.</p>

        ) : (

          <>

            {unknownMerchants.map((merchant) => (
              <div key={merchant.merchant_name} className="form-row unknown-category-row">
                <span>
                  <strong>{merchant.merchant_name}</strong> — {formatCurrency(merchant.total)}
                </span>
                <select
                  value={unknownAssignments[merchant.merchant_name] ?? ""}
                  onChange={(event) =>
                    setUnknownAssignments((current) => ({
                      ...current,
                      [merchant.merchant_name]: event.target.value,
                    }))
                  }
                >
                  <option value="">Select expenses category…</option>
                  {expenseCategoryOptions.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                  <option value={TRANSFER_CATEGORY_LABEL}>{TRANSFER_CATEGORY_LABEL}</option>
                </select>
              </div>
            ))}

            <button className="tab active" onClick={applyUnknown}>

              Apply unknown categorization

            </button>

          </>

        )}

      </section>

      )}



      {showEditorSection && (

      <>

      <section className="card editor-card">

        <h3>Review and edit records</h3>

        <p className="transfer-category-note">
          Label account-to-account movements as <strong>{TRANSFER_CATEGORY_LABEL}</strong>. They are
          excluded from income and expense totals so you do not double-count spending.
        </p>

        <p>

          Rows load automatically for the selected period. Add income (Salary, Pension),

          expenses (Rent, Mortgage payment, Groceries, Restaurants), or transfers, then save changes. If a row has a date,

          it is assigned to that month&apos;s period automatically (for example, rent dated

          29/6/26 goes to June even while you are editing another period).

        </p>

        <div className="form-row">

          <label className="review-period-label">

            Period

            <select value={editPeriod} onChange={(event) => setEditPeriod(event.target.value)}>

              {data.periods.map((period) => (

                <option key={period} value={period}>

                  {period}

                </option>

              ))}

            </select>

          </label>

          <button className="tab" onClick={reloadEditor}>

            Reload rows

          </button>

        </div>



        {editorLoaded && (

          <>

            <div className="table-scroll">

              <table>

                <thead>

                  <tr>

                    <th>Merchant</th>

                    <th>{UI_LABELS.incomeExpenseCategory}</th>

                    <th>Amount</th>

                    <th>Date</th>

                    <th />

                  </tr>

                </thead>

                <tbody>

                  {editableRows.map((row, index) => (

                    <tr key={`${row.id}-${index}`}>

                      <td>

                        <input

                          value={row.merchant_name}

                          onChange={(event) =>

                            updateRow(index, "merchant_name", event.target.value)

                          }

                        />

                      </td>

                      <td>

                        <select

                          value={row.category}

                          onChange={(event) => updateRow(index, "category", event.target.value)}

                        >

                          <option value="">Select category</option>

                          <optgroup label="Income">

                            {INCOME_CATEGORY_OPTIONS.map((category) => (

                              <option key={category} value={category}>

                                {category}

                              </option>

                            ))}

                          </optgroup>

                          <optgroup label="Transfers (excluded from totals)">

                            <option value={TRANSFER_CATEGORY_LABEL}>{TRANSFER_CATEGORY_LABEL}</option>

                          </optgroup>

                          <optgroup label="All categories">

                            {allCategories.map((category) => (

                              <option key={category} value={category}>

                                {category}

                              </option>

                            ))}

                          </optgroup>

                        </select>

                      </td>

                      <td>

                        <input

                          type="number"

                          value={row.amount}

                          onChange={(event) =>

                            updateRow(index, "amount", Number(event.target.value))

                          }

                        />

                      </td>

                      <td>

                        <input

                          value={row.date}

                          onChange={(event) => updateRow(index, "date", event.target.value)}

                        />

                      </td>

                      <td>

                        <button className="tab" onClick={() => removeRow(index)}>

                          Remove

                        </button>

                      </td>

                    </tr>

                  ))}

                </tbody>

              </table>

            </div>

            <div className="form-row editor-actions">

              <button className="tab" onClick={addRow}>

                Add row

              </button>

              <button className="tab active save-changes-btn" onClick={saveEditor}>

                Save changes

              </button>

            </div>

            <div

              ref={saveNoticeRef}

              className={`save-notice inline ${savePulse ? "visible pulse" : ""}`}

              aria-live="polite"

            >

              {savePulse && statusMessage?.kind === "success" && (

                <>

                  <strong>✓ {statusMessage.message}</strong>

                  {statusMessage.detail && <p>{statusMessage.detail}</p>}

                </>

              )}

            </div>

          </>

        )}

      </section>



      <section className="card">

        <h3>AI categorization check</h3>

        {actionableFlags.length === 0 ? (

          <p>No unusual categorizations detected in your uploaded transactions.</p>

        ) : (

          <>

            <p>
              These suggestions apply only to merchants already in your upload. They are applied
              unless you choose <strong>Keep current</strong> for a row.
            </p>

            {actionableFlags.map((flag) => {

              const key = `${flag.period}-${flag.row_id}`;

              return (

                <div key={key} className="flag-card">

                  <div className="flag-card-header">

                    <strong>{flag.merchant_name}</strong>

                    <span className="flag-amount">{formatCurrency(flag.amount)}</span>

                  </div>

                  <div className="flag-meta">

                    {flag.period} · {flag.current_category} → {flag.suggested_category}

                  </div>

                  <p className="flag-reason">{flag.reason}</p>

                  <div className="radio-row">

                    <label>

                      <input

                        type="radio"

                        name={key}

                        checked={(flagDecisions[key] ?? "change") === "change"}

                        onChange={() => setFlagDecisions((d) => ({ ...d, [key]: "change" }))}

                      />

                      Apply suggestion ({flag.suggested_category})

                    </label>

                    <label>

                      <input

                        type="radio"

                        name={key}

                        checked={flagDecisions[key] === "keep"}

                        onChange={() => setFlagDecisions((d) => ({ ...d, [key]: "keep" }))}

                      />

                      Keep current ({flag.current_category})

                    </label>

                  </div>

                </div>

              );

            })}

            <div className="form-row">

              <button className="tab active" onClick={() => applyFlags(actionableFlags)}>

                Apply categorization fixes

              </button>

              <button className="tab" onClick={applyAllSuggestions}>

                Accept all suggestions

              </button>

            </div>

          </>

        )}

      </section>

      </>

      )}

    </div>

  );

}


