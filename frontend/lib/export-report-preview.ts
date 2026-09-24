import {
  buildCustomReportPageSections,
  CustomReportType,
  CustomReportPayload,
} from "@/lib/export-custom-reports";
import {
  buildRelocationReportPageSections,
  ReportPayload,
} from "@/lib/export-relocation-report";
import {
  buildReportDocument,
  buildReportPageShell,
  downloadReportPdf,
  escapeHtml,
} from "@/lib/report-export";

type PreviewPageEntry = {
  reportGroup: string;
  pageTitle: string;
  html: string;
};

const CUSTOM_REPORT_TYPES: CustomReportType[] = [
  "expenses-by-category",
  "financial-health",
  "best-fit-cities",
];

const CUSTOM_PAGE_TITLES: Record<CustomReportType, string[]> = {
  "expenses-by-category": ["Expenses by category"],
  "financial-health": [
    "Financial health score",
    "Merchants & category changes",
  ],
  "best-fit-cities": [
    "Relocation overview",
    "Affordability adjustment",
    "Financial health & relocation fit",
    "Spending vs best-fit city",
    "About your best-fit city",
  ],
};

const RELOCATION_PAGE_TITLES = [
  "Relocation overview",
  "Affordability adjustment",
  "Financial health & relocation fit",
  "Spending vs best-fit city",
  "About your best-fit city",
];

function renumberPage(html: string, pageNumber: number, totalPages: number) {
  return html.replace(/Page \d+ of \d+/g, `Page ${pageNumber} of ${totalPages}`);
}

function buildCoverPage(totalPages: number, entries: PreviewPageEntry[]) {
  const rows = entries
    .map(
      (entry, index) => `
    <tr class="${index % 2 === 0 ? "stripe" : ""}">
      <td>${index + 2}</td>
      <td><strong>${escapeHtml(entry.reportGroup)}</strong></td>
      <td>${escapeHtml(entry.pageTitle)}</td>
    </tr>`
    )
    .join("");

  const body = `
    <div class="report-section-bordered">
      <h2 class="section-title">Report page guide</h2>
      <p class="report-explanatory-callout">
        This preview PDF uses <strong>sample multi-month transactions</strong> (March–May 2026) with salary,
        pension, mortgage payment, groceries, transport, and other categories. It shows every exportable page
        exactly as it appears when you download reports from the app.
      </p>
      <table class="index-table report-table-styled category-changes-table-large">
        <thead>
          <tr>
            <th>Page</th>
            <th>Report</th>
            <th>Section</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <p class="muted-note" style="margin-top:14px;">
        Sample file: <strong>sample-multi-month-transactions.csv</strong> · Currency: USD ·
        Household size (relocation): 2 · Lifestyle: Average
      </p>
    </div>`;

  return buildReportPageShell({
    pageNumber: 1,
    totalPages,
    reportLabel: "Report preview (sample data)",
    pageTitle: "What each report page looks like",
    pageSubtitle: "Generated from sample transactions for printing and review",
    body,
    showPrivacy: false,
  });
}

function collectCustomPages(payload: CustomReportPayload): PreviewPageEntry[] {
  const sections = buildCustomReportPageSections(CUSTOM_REPORT_TYPES, payload);
  const entries: PreviewPageEntry[] = [];

  for (const type of CUSTOM_REPORT_TYPES) {
    const titles = CUSTOM_PAGE_TITLES[type];
    for (const title of titles) {
      const html = sections.shift();
      if (!html) break;
      entries.push({
        reportGroup: "Custom financial report",
        pageTitle: title,
        html,
      });
    }
  }

  return entries;
}

function collectRelocationPages(payload: ReportPayload): PreviewPageEntry[] {
  return buildRelocationReportPageSections(payload).map((html, index) => ({
    reportGroup: "Relocation affordability",
    pageTitle: RELOCATION_PAGE_TITLES[index] ?? `Page ${index + 1}`,
    html,
  }));
}

export function buildReportPreviewHtml(
  customPayload: CustomReportPayload,
  relocationPayload: ReportPayload
) {
  const entries = [
    ...collectCustomPages(customPayload),
    ...collectRelocationPages(relocationPayload),
  ];
  const totalPages = entries.length + 1;

  const cover = buildCoverPage(totalPages, entries);
  const reportPages = entries
    .map((entry, index) => renumberPage(entry.html, index + 2, totalPages))
    .join("");

  return buildReportDocument("Report Preview (Sample Data)", `${cover}${reportPages}`);
}

export async function downloadReportPreviewPdf(
  customPayload: CustomReportPayload,
  relocationPayload: ReportPayload
) {
  const html = buildReportPreviewHtml(customPayload, relocationPayload);
  const stamp = new Date().toISOString().slice(0, 10);
  await downloadReportPdf(html, `report-preview-sample-${stamp}.pdf`);
}
