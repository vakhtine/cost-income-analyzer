export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function reportPreparedLine(
  generatedAt: string,
  periodLabel: string,
  displayCurrency: string
) {
  return `<p class="report-prepared">Report prepared on ${escapeHtml(generatedAt)} for period ${escapeHtml(periodLabel)}. All amounts in ${escapeHtml(displayCurrency)}.</p>`;
}

export const REPORT_BRAND_FOOTER_PATH = "/brand-pdf-footer.png";

export function reportAssetUrl(path: string) {
  if (typeof window === "undefined") return path;
  return `${window.location.origin}${path}`;
}

export const BASE_REPORT_STYLES = `
  @page { size: A4 portrait; margin: 10mm; }
  * { box-sizing: border-box; }
  :root {
    --ink: #1c2b33;
    --muted: #5c6b73;
    --line: #d8e4e8;
    --primary: #1a6b7c;
    --primary-dark: #134e6f;
    --primary-light: #b8d4dc;
    --secondary: #7eb8c9;
    --danger: #c0392b;
    --good: #2d6a4f;
    --gold: #c9a227;
    --stripe: #edf4f6;
  }
  html, body {
    margin: 0;
    padding: 0;
    width: 794px;
    color: var(--ink);
    font-family: "Segoe UI", Inter, Arial, sans-serif;
    font-size: 12px;
    line-height: 1.4;
    background: #fff;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .page {
    position: relative;
    display: flex;
    flex-direction: column;
    width: 794px;
    min-height: 1050px;
    height: 1050px;
    overflow: hidden;
    padding: 16px 16px 20px;
    page-break-after: always;
    break-after: page;
    background: #fff;
  }
  .page:last-child { page-break-after: auto; }
  .page-header {
    flex: 0 0 auto;
    border-bottom: 2px solid var(--primary);
    padding-bottom: 10px;
    margin-bottom: 14px;
  }
  .page-content {
    flex: 1 1 auto;
    min-height: 0;
    overflow: hidden;
    padding-bottom: 12px;
  }
  .top-bar {
    display: flex;
    justify-content: space-between;
    font-size: 9px;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-bottom: 6px;
  }
  .page-title {
    margin: 0;
    font-size: 20px;
    font-weight: 700;
    color: var(--primary-dark);
  }
  .page-subtitle {
    margin: 4px 0 0;
    font-size: 11px;
    color: var(--muted);
  }
  .main-title {
    margin: 0 0 8px;
    font-size: 18px;
    font-weight: 700;
    color: var(--primary-dark);
  }
  .intro {
    margin: 0 0 12px;
    color: var(--muted);
    font-size: 11px;
    max-width: 95%;
  }
  .report-prepared {
    margin: 0 0 12px;
    color: var(--ink);
    font-size: 11px;
    font-weight: 700;
    line-height: 1.45;
    max-width: 95%;
  }
  .section-explanation {
    margin: 0 0 12px;
    font-size: 11px;
    color: var(--ink);
    line-height: 1.45;
  }
  .section-explanation strong {
    color: var(--ink);
  }
  .score-ring-caption {
    margin: 8px 0 12px;
    text-align: center;
    font-size: 11px;
    font-weight: 700;
    color: var(--ink);
  }
  .city-context-grid {
    margin-bottom: 12px;
  }
  .currency-note {
    margin: 0 0 12px;
    color: var(--primary-dark);
    font-size: 11px;
    font-weight: 700;
  }
  .intro-emphasis {
    margin: 0 0 12px;
    color: var(--ink);
    font-size: 11px;
    line-height: 1.5;
    font-weight: 700;
    max-width: 95%;
  }
  .privacy-banner {
    margin: 0 0 14px;
    padding: 10px 12px;
    border: 2px solid var(--primary);
    border-radius: 6px;
    background: #edf4f6;
    color: var(--primary-dark);
    font-size: 11px;
    font-weight: 700;
    line-height: 1.45;
  }
  .divider {
    border: none;
    border-top: 2px solid var(--primary-light);
    margin: 0 0 14px;
  }
  .meta-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px 24px;
    margin-bottom: 16px;
    font-size: 11px;
  }
  .meta-grid span {
    display: block;
    font-size: 9px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--muted);
  }
  .section-title {
    margin: 12px 0 8px;
    font-size: 14px;
    font-weight: 700;
    color: var(--primary-dark);
  }
  .section-note { margin: 0 0 12px; font-size: 11px; color: var(--muted); }
  .index-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 11px;
    margin-bottom: 12px;
  }
  .index-table th {
    text-align: left;
    font-size: 9px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--muted);
    border-bottom: 2px solid var(--primary-light);
    padding: 8px;
  }
  .index-table th:not(:first-child),
  .index-table td:not(:first-child) { text-align: right; }
  .index-table td { padding: 8px; border-bottom: 1px solid var(--line); }
  .index-table tr.stripe { background: var(--stripe); }
  .index-table tr.total-row { background: var(--primary); color: #fff; }
  .index-table tr.total-row td { border: none; font-weight: 700; }
  .index-table.compact td { padding: 6px 8px; }
  .metric-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
    margin-bottom: 12px;
  }
  .metric-card {
    border: 1px solid var(--line);
    border-radius: 4px;
    background: var(--stripe);
    padding: 8px;
    text-align: center;
  }
  .metric-card span {
    display: block;
    font-size: 8px;
    text-transform: uppercase;
    color: var(--muted);
  }
  .metric-card strong { font-size: 14px; color: var(--primary-dark); }
  .score-ring {
    width: 96px;
    height: 96px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 12px;
    font-size: 24px;
    font-weight: 700;
    color: var(--primary-dark);
    border: 4px solid var(--primary);
  }
  .score-ring-good {
    color: #047857;
    border-color: #059669;
    background: rgba(209, 250, 229, 0.65);
  }
  .score-ring-mid {
    color: #b45309;
    border-color: #f59e0b;
    background: rgba(254, 243, 199, 0.75);
  }
  .score-ring-low {
    color: #b91c1c;
    border-color: #ef4444;
    background: rgba(254, 226, 226, 0.75);
  }
  .score-summary-good strong { color: #047857; }
  .score-summary-mid strong { color: #b45309; }
  .score-summary-low strong { color: #b91c1c; }
  .bar-chart-row {
    display: grid;
    grid-template-columns: 120px 1fr 80px;
    gap: 8px;
    align-items: center;
    margin-bottom: 6px;
  }
  .bar-chart-section {
    margin-top: 4px;
    padding-bottom: 8px;
  }
  .bar-track {
    height: 20px;
    background: #eef4f6;
    border-radius: 2px;
    overflow: hidden;
  }
  .bar-fill {
    height: 100%;
    background: var(--primary);
    border-radius: 2px;
  }
  .factor-row {
    border: 1px solid var(--line);
    border-radius: 4px;
    padding: 8px 10px;
    margin-bottom: 8px;
    background: #fff;
  }
  .factor-row strong { color: var(--primary-dark); }
  .factor-detail {
    margin: 6px 0 0;
    font-size: 11px;
    color: var(--ink);
    font-weight: 700;
    line-height: 1.45;
  }
  .factor-track {
    height: 10px;
    background: #eef4f6;
    border-radius: 999px;
    overflow: hidden;
    margin: 6px 0;
  }
  .factor-fill {
    height: 100%;
    background: var(--primary);
    border-radius: 999px;
  }
  .factor-fill-good { background: #2d6a4f; }
  .factor-fill-mid { background: #d97706; }
  .factor-fill-low { background: #b91c1c; }
  .summary-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 14px;
    font-size: 11px;
  }
  .summary-table td {
    border-bottom: 1px solid var(--line);
    padding: 10px 8px;
    vertical-align: middle;
  }
  .summary-table td:last-child { text-align: right; }
  .summary-table .highlight-row { background: var(--stripe); }
  .pct-pill {
    display: inline-block;
    background: var(--primary);
    color: #fff;
    font-size: 9px;
    font-weight: 700;
    padding: 2px 6px;
    border-radius: 3px;
    margin-right: 6px;
  }
  .sub-val { font-size: 10px; color: var(--muted); margin-top: 2px; }
  .chart-title { margin: 12px 0 8px; font-size: 14px; font-weight: 700; color: var(--primary-dark); }
  .adjustment-chart { margin-bottom: 10px; }
  .adj-row {
    display: grid;
    grid-template-columns: 160px 1fr 80px;
    gap: 8px;
    align-items: center;
    margin-bottom: 8px;
  }
  .adj-label { font-size: 10px; }
  .adj-bar-wrap {
    height: 22px;
    background: #eef4f6;
    border-radius: 2px;
    overflow: hidden;
  }
  .adj-bar { height: 100%; border-radius: 2px; }
  .adj-bar.primary { background: var(--primary); }
  .adj-bar.secondary { background: var(--secondary); }
  .adj-bar.income { background: #1a6b7c; }
  .adj-bar.cost { background: #c9a227; }
  .adj-bar.balance-pos { background: #2d6a4f; }
  .adj-bar.balance-neg { background: #c0392b; }
  .adj-bar.danger { background: var(--danger); }
  .adj-value { font-size: 11px; font-weight: 700; text-align: right; }
  .legend {
    display: flex;
    gap: 16px;
    font-size: 10px;
    color: var(--muted);
    margin: 8px 0 12px;
  }
  .legend.centered { justify-content: center; }
  .swatch {
    display: inline-block;
    width: 10px;
    height: 10px;
    border-radius: 1px;
    margin-right: 4px;
    vertical-align: middle;
  }
  .swatch.primary { background: var(--primary); }
  .swatch.secondary { background: var(--secondary); }
  .swatch.danger { background: var(--danger); }
  .swatch.income { background: #1a6b7c; }
  .swatch.cost { background: #c9a227; }
  .swatch.balance-pos { background: #2d6a4f; }
  .swatch.balance-neg { background: #c0392b; }
  .verdict-box {
    border: 1px solid var(--line);
    background: var(--stripe);
    padding: 10px 12px;
    font-size: 11px;
    border-radius: 4px;
    margin-bottom: 12px;
  }
  .verdict-box p { margin: 6px 0 0; color: var(--muted); }
  .readiness-strip {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
    margin: 12px 0;
  }
  .readiness-strip div {
    border: 1px solid var(--line);
    border-radius: 4px;
    padding: 8px;
    background: var(--stripe);
    text-align: center;
  }
  .readiness-strip span {
    display: block;
    font-size: 8px;
    text-transform: uppercase;
    color: var(--muted);
  }
  .readiness-strip strong { font-size: 14px; color: var(--primary-dark); }
  .tip-box {
    border-left: 3px solid var(--gold);
    background: #faf6f0;
    padding: 8px 10px;
    font-size: 10px;
    margin-bottom: 10px;
  }
  .column-chart {
    display: grid;
    grid-template-columns: 36px 1fr;
    gap: 8px;
    height: 120px;
    margin-bottom: 10px;
    align-items: stretch;
  }
  .y-axis {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    font-size: 9px;
    color: var(--muted);
    text-align: right;
  }
  .columns {
    display: flex;
    align-items: flex-end;
    justify-content: space-around;
    gap: 8px;
    border-left: 1px solid var(--line);
    border-bottom: 1px solid var(--line);
    padding: 0 8px;
  }
  .col-bar-wrap {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    height: 100%;
    justify-content: flex-end;
    font-size: 8px;
    color: var(--muted);
    text-align: center;
  }
  .col-bar {
    width: 70%;
    min-height: 4px;
    border-radius: 2px 2px 0 0;
    margin-bottom: 4px;
  }
  .col-bar.up { background: var(--primary); }
  .col-bar.down { background: var(--danger); }
  .pos { color: var(--good); }
  .neg { color: var(--danger); }
  .fine-print { margin: 0; font-size: 9px; color: var(--muted); }
  .muted { color: var(--muted); font-size: 10px; }
  .ftr {
    display: none;
  }
  .pdf-page-footer {
    flex: 0 0 auto;
    margin-top: auto;
    padding-top: 10px;
    text-align: right;
    font-size: 9px;
    font-weight: 600;
    color: var(--muted);
    letter-spacing: 0.04em;
  }
  .ftr-page {
    position: static;
    color: var(--muted);
    text-shadow: none;
  }
`;

export function buildReportDocument(title: string, body: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>${BASE_REPORT_STYLES}</style>
</head>
<body>
  ${body}
</body>
</html>`;
}

export function buildReportPageShell(options: {
  pageNumber: number;
  totalPages: number;
  reportLabel: string;
  pageTitle: string;
  pageSubtitle?: string;
  body: string;
  privacyNotice?: string;
}) {
  const { pageNumber, totalPages, reportLabel, pageTitle, pageSubtitle, body, privacyNotice } =
    options;
  const privacyBlock = privacyNotice
    ? `<div class="privacy-banner">${escapeHtml(privacyNotice)}</div>`
    : "";
  return `
  <section class="page">
    <header class="page-header">
      <div class="top-bar">
        <span>Page ${pageNumber} of ${totalPages}</span>
      </div>
      <h1 class="page-title">${escapeHtml(reportLabel)}: ${escapeHtml(pageTitle)}</h1>
      ${pageSubtitle ? `<p class="page-subtitle">${escapeHtml(pageSubtitle)}</p>` : ""}
    </header>
    ${privacyBlock}
    <div class="page-content">
      ${body}
    </div>
    <footer class="pdf-page-footer">
      <span class="ftr-page">Page ${pageNumber} of ${totalPages}</span>
    </footer>
  </section>`;
}

function mountReportDocument(html: string) {
  const iframe = document.createElement("iframe");
  iframe.setAttribute(
    "style",
    [
      "position:fixed",
      "left:0",
      "top:0",
      "width:794px",
      "height:1200px",
      "border:0",
      "opacity:0.01",
      "pointer-events:none",
      "z-index:2147483647",
    ].join(";")
  );
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument ?? iframe.contentWindow?.document;
  if (!doc) {
    iframe.remove();
    throw new Error("Could not prepare PDF document.");
  }

  doc.open();
  doc.write(html);
  doc.close();

  return { iframe, doc };
}

async function waitForReportLayout(doc: Document) {
  await new Promise<void>((resolve) => {
    if (doc.readyState === "complete") {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      return;
    }
    doc.addEventListener(
      "readystatechange",
      () => {
        if (doc.readyState === "complete") {
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
        }
      },
      { once: true }
    );
    window.setTimeout(resolve, 400);
  });
}

async function waitForReportImages(doc: Document) {
  const images = Array.from(doc.images);
  await Promise.all(
    images.map(
      (image) =>
        new Promise<void>((resolve) => {
          if (image.complete) {
            resolve();
            return;
          }
          image.addEventListener("load", () => resolve(), { once: true });
          image.addEventListener("error", () => resolve(), { once: true });
        })
    )
  );
}

export async function downloadReportPdf(html: string, pdfFilename: string) {
  const filename = pdfFilename.endsWith(".pdf") ? pdfFilename : `${pdfFilename}.pdf`;
  const { iframe, doc } = mountReportDocument(html);

  try {
    await waitForReportLayout(doc);
    await waitForReportImages(doc);

    const html2canvas = (await import("html2canvas")).default;
    const { jsPDF } = await import("jspdf");

    const pageElements = Array.from(doc.body.querySelectorAll(".page")) as HTMLElement[];
    const targets = pageElements.length ? pageElements : [doc.body];

    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 8;
    const printableWidth = pageWidth - margin * 2;
    const printableHeight = pageHeight - margin * 2;

    for (let index = 0; index < targets.length; index += 1) {
      const target = targets[index];
      const canvas = await html2canvas(target, {
        scale: 2,
        useCORS: true,
        logging: false,
        width: 794,
        windowWidth: 794,
        backgroundColor: "#ffffff",
      });

      if (!canvas.width || !canvas.height) {
        throw new Error("PDF render produced empty content.");
      }

      const imgWidth = printableWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const scale = imgHeight > printableHeight ? printableHeight / imgHeight : 1;
      const renderWidth = imgWidth * scale;
      const renderHeight = imgHeight * scale;
      const imgData = canvas.toDataURL("image/jpeg", 0.95);

      if (index > 0) pdf.addPage();
      pdf.addImage(imgData, "JPEG", margin, margin, renderWidth, renderHeight);
    }

    pdf.save(filename);
  } finally {
    iframe.remove();
  }
}

export async function exportReportPdf(html: string, pdfFilename: string) {
  await downloadReportPdf(html, pdfFilename);
}
