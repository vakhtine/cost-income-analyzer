"use client";

import { useState } from "react";
import { PeriodSelect } from "@/components/PeriodSelect";
import { exportRelocationReport, ReportPayload } from "@/lib/export-relocation-report";

type Props = {
  buildPayload: (period: string) => ReportPayload | Promise<ReportPayload>;
  periods: string[];
  defaultPeriod?: string;
  disabled?: boolean;
};

export function RelocationReportExport({
  buildPayload,
  periods,
  defaultPeriod = "",
  disabled = false,
}: Props) {
  const [exportPeriod, setExportPeriod] = useState(defaultPeriod);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const effectivePeriod = exportPeriod || defaultPeriod || periods[periods.length - 1] || "";

  async function handleExport() {
    if (!effectivePeriod) {
      setError("Choose a period for which the report is to be generated.");
      return;
    }

    setError("");
    setStatus("");
    setLoading(true);
    try {
      await exportRelocationReport(await buildPayload(effectivePeriod));
      setStatus("PDF report downloaded successfully.");
      window.setTimeout(() => setStatus(""), 8000);
    } catch (exportError) {
      setError(
        exportError instanceof Error ? exportError.message : "Could not export report."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="card export-report-panel">
      <div className="section-heading">
        <h3>Export relocation report</h3>
        <p>
          Export relocation report PDF with affordability tables, adjustment chart, and category
          comparison. Includes your top 3 recommended cities when available.
        </p>
      </div>

      {periods.length > 0 && (
        <PeriodSelect
          periods={periods}
          value={effectivePeriod}
          onChange={setExportPeriod}
          label="Report period"
          className="custom-report-period-label"
          disabled={disabled || loading}
        />
      )}

      <div className="export-actions">
        <button className="tab active" onClick={handleExport} disabled={disabled || loading}>
          {loading ? "Generating PDF..." : "Export report (PDF)"}
        </button>
      </div>
      {status && <div className="save-notice inline visible">{status}</div>}
      {error && <div className="error">{error}</div>}
    </section>
  );
}
