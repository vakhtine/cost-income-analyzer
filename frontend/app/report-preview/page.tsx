"use client";

import { useState } from "react";
import { downloadReportPreviewPdf } from "@/lib/export-report-preview";
import { buildSampleReportPayloads } from "@/lib/report-preview-sample";

export default function ReportPreviewPage() {
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleDownload() {
    setLoading(true);
    setError("");
    setStatus("Loading sample transactions and city benchmarks…");

    try {
      const { customPayload, relocationPayload, latestPeriod } =
        await buildSampleReportPayloads();
      setStatus(`Building PDF preview for ${latestPeriod}…`);
      await downloadReportPreviewPdf(customPayload, relocationPayload);
      setStatus("Download started — check your downloads folder.");
    } catch (downloadError) {
      setError(
        downloadError instanceof Error
          ? downloadError.message
          : "Could not generate the preview PDF."
      );
      setStatus("");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="stack" style={{ maxWidth: 720, margin: "48px auto", padding: "0 20px" }}>
      <section className="card">
        <h1>Report preview PDF</h1>
        <p>
          Download a single PDF showing <strong>every report page</strong> filled with sample
          transactions (March–May 2026). Use it to review layout, typography, and section content
          before printing or sharing.
        </p>

        <div className="explanatory-callout" style={{ marginTop: 16 }}>
          Includes 9 pages: a cover index, 4 custom report pages (expenses, financial health ×2,
          best-fit cities), and 4 relocation report pages — all generated with the same engine as
          the in-app exports.
        </div>

        <h3 style={{ marginTop: 24 }}>Sample data highlights</h3>
        <ul>
          <li>3 months of income and expenses (salary, pension, mortgage payment, groceries, etc.)</li>
          <li>Mortgage payment as the #1 merchant (shown in financial health report)</li>
          <li>Category change explanations (month-over-month comparisons)</li>
          <li>Live city benchmark data for relocation and best-fit city rankings</li>
          <li>Estimated rent for current location (no rent in uploaded sample records)</li>
        </ul>

        <button
          className="tab active"
          type="button"
          onClick={handleDownload}
          disabled={loading}
          style={{ marginTop: 20 }}
        >
          {loading ? "Generating preview PDF…" : "Download report preview PDF"}
        </button>

        {status ? <p className="save-notice inline visible">{status}</p> : null}
        {error ? <div className="error">{error}</div> : null}
      </section>

      <section className="card">
        <h3>Sample CSV</h3>
        <p>
          The preview uses{" "}
          <a href="/sample-multi-month-transactions.csv" download>
            sample-multi-month-transactions.csv
          </a>
          . You can upload this file in the app to reproduce the same numbers interactively.
        </p>
      </section>
    </main>
  );
}
