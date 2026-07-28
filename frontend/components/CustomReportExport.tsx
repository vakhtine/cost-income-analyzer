"use client";

import { useMemo, useState } from "react";
import { PeriodRangeSlider } from "@/components/PeriodRangeSlider";
import {
  CUSTOM_REPORT_LABELS,
  CustomReportPayload,
  CustomReportType,
  exportCustomReports,
  PeriodReportSelection,
} from "@/lib/export-custom-reports";

type Props = {
  buildPayload: (
    selection: PeriodReportSelection
  ) => CustomReportPayload | Promise<CustomReportPayload>;
  disabled?: boolean;
  availableTypes?: CustomReportType[];
  periods?: string[];
  requirePeriodSelection?: boolean;
};

const ALL_TYPES: CustomReportType[] = [
  "expenses-by-category",
  "financial-health",
  "best-fit-cities",
];

export function CustomReportExport({
  buildPayload,
  disabled = false,
  availableTypes = ALL_TYPES,
  periods,
  requirePeriodSelection = false,
}: Props) {
  const [selected, setSelected] = useState<CustomReportType[]>([
    "expenses-by-category",
    "financial-health",
  ]);
  const [periodMode, setPeriodMode] = useState<"single" | "range">("single");
  const [reportPeriod, setReportPeriod] = useState("");
  const [rangeStartIndex, setRangeStartIndex] = useState(0);
  const [rangeEndIndex, setRangeEndIndex] = useState(
    Math.max(0, (periods?.length ?? 1) - 1)
  );
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const canUseRange = (periods?.length ?? 0) >= 2;

  const selection = useMemo((): PeriodReportSelection | null => {
    if (!periods?.length) return null;
    if (periodMode === "range" && canUseRange) {
      const start = Math.min(rangeStartIndex, rangeEndIndex);
      const end = Math.max(rangeStartIndex, rangeEndIndex);
      return { mode: "range", start: periods[start], end: periods[end] };
    }
    const period = reportPeriod || periods[periods.length - 1];
    if (requirePeriodSelection && !reportPeriod) return null;
    return { mode: "single", period };
  }, [
    periodMode,
    canUseRange,
    rangeStartIndex,
    rangeEndIndex,
    reportPeriod,
    periods,
    requirePeriodSelection,
  ]);

  function toggleType(type: CustomReportType) {
    setSelected((current) =>
      current.includes(type) ? current.filter((item) => item !== type) : [...current, type]
    );
  }

  async function handleExport() {
    if (!selected.length) {
      setError("Select at least one report type.");
      return;
    }

    if (!selection) {
      setError(
        periodMode === "range"
          ? "Choose a valid period range."
          : "Choose a period for which the report is to be generated."
      );
      return;
    }

    setError("");
    setStatus("");
    setLoading(true);
    try {
      await exportCustomReports(selected, await buildPayload(selection));
      setStatus("PDF report downloaded successfully.");
      window.setTimeout(() => setStatus(""), 8000);
    } catch (exportError) {
      setError(
        exportError instanceof Error ? exportError.message : "Could not export custom report."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="card export-report-panel custom-report-panel">
      <div className="section-heading">
        <h3>Custom PDF reports</h3>
        <p>
          Choose one or more reports to generate. Each selected report becomes its own page in
          the PDF file.
        </p>
      </div>

      {periods?.length ? (
        <div className="custom-report-period-section">
          <div className="custom-report-period-tabs">
            <button
              type="button"
              className={`tab ${periodMode === "single" ? "active" : ""}`}
              onClick={() => setPeriodMode("single")}
              disabled={disabled || loading}
            >
              Single period
            </button>
            <button
              type="button"
              className={`tab ${periodMode === "range" ? "active" : ""}`}
              onClick={() => setPeriodMode("range")}
              disabled={disabled || loading || !canUseRange}
            >
              Period range
            </button>
          </div>

          {periodMode === "single" ? (
            <label className="custom-report-period-label">
              Report period
              <select
                value={reportPeriod}
                onChange={(event) => {
                  setReportPeriod(event.target.value);
                  setError("");
                }}
                disabled={disabled || loading}
              >
                <option value="">
                  {requirePeriodSelection ? "Select a period..." : "Latest period"}
                </option>
                {periods.map((period) => (
                  <option key={period} value={period}>
                    {period}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <PeriodRangeSlider
              periods={periods}
              startIndex={rangeStartIndex}
              endIndex={rangeEndIndex}
              onChange={(start, end) => {
                setRangeStartIndex(start);
                setRangeEndIndex(end);
                setError("");
              }}
              disabled={disabled || loading}
            />
          )}
        </div>
      ) : null}

      <div className="custom-report-options">
        {availableTypes.map((type) => (
          <label key={type} className="custom-report-option">
            <input
              type="checkbox"
              checked={selected.includes(type)}
              onChange={() => toggleType(type)}
              disabled={disabled || loading}
            />
            <span>{CUSTOM_REPORT_LABELS[type]}</span>
          </label>
        ))}
      </div>

      <div className="export-actions">
        <button
          className="tab active"
          onClick={handleExport}
          disabled={disabled || loading || !selected.length}
        >
          {loading ? "Generating PDF..." : "Generate selected reports (PDF)"}
        </button>
      </div>

      {status && <div className="save-notice inline visible">{status}</div>}
      {error && <div className="error">{error}</div>}
    </section>
  );
}
