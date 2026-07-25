"use client";

import { useState } from "react";
import {
  CUSTOM_REPORT_LABELS,
  CustomReportPayload,
  CustomReportType,
  exportCustomReports,
} from "@/lib/export-custom-reports";

type Props = {
  buildPayload: (periodLabel: string) => CustomReportPayload | Promise<CustomReportPayload>;
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
  const [reportPeriod, setReportPeriod] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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

    if (requirePeriodSelection && !reportPeriod) {
      setError("Choose a period for which the report is to be generated.");
      return;
    }

    setError("");
    setStatus("");
    setLoading(true);
    try {
      const periodLabel = requirePeriodSelection ? reportPeriod : reportPeriod || periods?.[0] || "";
      await exportCustomReports(selected, await buildPayload(periodLabel));
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
