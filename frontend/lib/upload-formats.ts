/** Delimited text exports (comma- or tab-separated). */
export const DELIMITED_UPLOAD_EXTENSIONS = [".csv", ".tsv"] as const;

/** Spreadsheet formats read via SheetJS (Excel, OpenDocument, etc.). */
export const SPREADSHEET_UPLOAD_EXTENSIONS = [
  ".xlsx",
  ".xlsm",
  ".xlsb",
  ".xls",
  ".ods",
] as const;

export const SUPPORTED_UPLOAD_EXTENSIONS = [
  ...DELIMITED_UPLOAD_EXTENSIONS,
  ...SPREADSHEET_UPLOAD_EXTENSIONS,
] as const;

export type SupportedUploadExtension = (typeof SUPPORTED_UPLOAD_EXTENSIONS)[number];

export const SUPPORTED_UPLOAD_ACCEPT = [
  ...SUPPORTED_UPLOAD_EXTENSIONS,
  "text/csv",
  "text/tab-separated-values",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
].join(",");

export const SUPPORTED_UPLOAD_LABEL =
  "CSV, TSV, XLSX, XLS, XLSM, XLSB, or ODS";

function fileExtension(name: string) {
  const match = name.trim().match(/(\.[^.\\/]+)$/i);
  return match ? match[1].toLowerCase() : "";
}

export function isDelimitedUpload(name: string) {
  const ext = fileExtension(name);
  return DELIMITED_UPLOAD_EXTENSIONS.includes(ext as (typeof DELIMITED_UPLOAD_EXTENSIONS)[number]);
}

export function isSpreadsheetUpload(name: string) {
  const ext = fileExtension(name);
  return SPREADSHEET_UPLOAD_EXTENSIONS.includes(
    ext as (typeof SPREADSHEET_UPLOAD_EXTENSIONS)[number]
  );
}

export function isSupportedUploadFile(name: string) {
  return isDelimitedUpload(name) || isSpreadsheetUpload(name);
}

export function periodLabelFromUploadFileName(name: string) {
  const base = name.replace(/\.[^.\\/]+$/i, "").trim();
  return base || name;
}

export function unsupportedUploadMessage(name?: string) {
  const prefix = name ? `"${name}" is not supported.` : "That file type is not supported.";
  return `${prefix} Upload ${SUPPORTED_UPLOAD_LABEL} files with matching column headers.`;
}
