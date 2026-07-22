"use client";

import { useState } from "react";
import { exportRelocationReport, ReportPayload } from "@/lib/export-relocation-report";

type Props = {
  buildPayload: () => ReportPayload | Promise<ReportPayload>;
  disabled?: boolean;
};

export function RelocationReportExport({ buildPayload, disabled = false }: Props) {
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleExport() {
    setError("");
    setStatus("");
    setLoading(true);
    try {
      await exportRelocationReport(await buildPayload());
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
