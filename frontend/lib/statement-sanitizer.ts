export const STATEMENT_SANITIZER = {
  title: "Excel statement sanitizer",
  description:
    "Download the Excel macro workbook plus step-by-step guides to remove sensitive details from your bank or card statements before upload.",
} as const;

export type SanitizerDownload = {
  id: string;
  fileName: string;
  publicPath: string;
  label: string;
  note: string;
  buttonLabel: string;
  kind: "excel" | "pdf" | "docx";
};

export const STATEMENT_SANITIZER_DOWNLOADS: SanitizerDownload[] = [
  {
    id: "workbook",
    fileName: "Balkans-Statement-Sanitizer.xlsm",
    publicPath: "/Balkans-Statement-Sanitizer.xlsm",
    label: "Balkans Statement Sanitizer",
    note: "Macro-enabled Excel workbook — paste statements, run the macro, export CSV",
    buttonLabel: "Download Excel workbook",
    kind: "excel",
  },
  {
    id: "visual-guide",
    fileName: "Balkans-Statement-Sanitizer-Visual-Guide.pdf",
    publicPath: "/Balkans-Statement-Sanitizer-Visual-Guide.pdf",
    label: "Visual quick guide (PDF)",
    note: "One-page diagram of the sanitize → export → upload workflow",
    buttonLabel: "Download visual guide",
    kind: "pdf",
  },
  {
    id: "user-guide",
    fileName: "Balkans-Statement-Sanitizer-User-Guide.docx",
    publicPath: "/Balkans-Statement-Sanitizer-User-Guide.docx",
    label: "User guide (Word)",
    note: "Full written instructions for every step in the sanitizer workbook",
    buttonLabel: "Download user guide",
    kind: "docx",
  },
];

export const STATEMENT_SANITIZER_STEPS = [
  "Download the Excel workbook (and optional guides below).",
  "Paste your actual financial statements into the workbook.",
  "Run the macro in Excel to clean and format your data.",
  "Export the resulting CSV onto your computer — only merchant names, amounts, expense category, and optional dates remain.",
  "Upload that CSV here in the drag-and-drop area below.",
  "Use the visual PDF for a quick overview, or the Word guide for detailed help.",
] as const;

export const STATEMENT_SANITIZER_PRIVACY =
  "No sensitive financial information is stored on our servers or shared with any third party. After a browser refresh, all uploaded analysis data is gone from this session. Your original statements and downloaded files stay on your computer only.";
