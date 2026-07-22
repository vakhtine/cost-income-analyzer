export const STATEMENT_SANITIZER = {
  fileName: "Balkans-Statement-Sanitizer.xlsm",
  publicPath: "/Balkans-Statement-Sanitizer.xlsm",
  title: "Excel statement sanitizer",
  description:
    "Download our Excel macro-enabled workbook to remove sensitive details from your bank or card statements before upload.",
} as const;

export const STATEMENT_SANITIZER_STEPS = [
  "Download the Excel file.",
  "Paste your actual financial statements into the workbook.",
  "Run the macro in Excel to clean and format your data.",
  "Export the resulting CSV onto your computer — only merchant names, amounts, expense category, and optional dates remain.",
  "Upload that CSV here in the drag-and-drop area below.",
  "See the Excel file for more detailed instructions.",
] as const;

export const STATEMENT_SANITIZER_PRIVACY =
  "No sensitive financial information is stored on our servers or shared with any third party. After a browser refresh, all uploaded analysis data is gone from this session. Your original statements and the Excel file stay on your computer only.";
