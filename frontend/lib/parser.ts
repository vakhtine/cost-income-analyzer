import Papa from "papaparse";
import * as XLSX from "xlsx";
import { COLUMN_ALIASES, resolveTransactionType, RawRow } from "@/lib/constants";
import { periodKeyFromDate } from "@/lib/period-utils";
import {
  isDelimitedUpload,
  isSpreadsheetUpload,
  isSupportedUploadFile,
  periodLabelFromUploadFileName,
  unsupportedUploadMessage,
} from "@/lib/upload-formats";
import { Transaction } from "@/lib/types";

function normalizeHeader(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

function headerSignature(headers: string[]) {
  return [...headers].map(normalizeHeader).sort().join("\0");
}

async function readExcelWorkbook(file: File) {
  const buffer = await file.arrayBuffer();
  return XLSX.read(buffer, { type: "array" });
}

function excelHeadersFromWorkbook(workbook: XLSX.WorkBook) {
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error("The spreadsheet has no worksheets.");
  }
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" });
  const headerRow = rows[0];
  if (!Array.isArray(headerRow)) {
    throw new Error("Could not read column headers from the spreadsheet.");
  }
  const headers = headerRow.map((cell) => String(cell ?? "").trim()).filter(Boolean);
  if (!headers.length) {
    throw new Error("Could not read column headers from the spreadsheet.");
  }
  return headers;
}

async function parseDelimitedText(text: string, fileName: string) {
  const isTsv = fileName.toLowerCase().endsWith(".tsv");
  const parsed = Papa.parse<Record<string, unknown>>(text, {
    header: true,
    skipEmptyLines: true,
    delimiter: isTsv ? "\t" : undefined,
  });
  if (parsed.errors.length) {
    throw new Error(`Could not read the ${isTsv ? "TSV" : "CSV"} file.`);
  }
  return parsed.data;
}

function parseExcelWorkbook(workbook: XLSX.WorkBook) {
  const periods: Record<string, Transaction[]> = {};
  let id = 0;
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
    const cleanName = sheetName.trim() || "Period";
    periods[cleanName] = parseSheetRows(rows, cleanName, id);
    id += periods[cleanName].length;
  }
  if (!Object.keys(periods).length) {
    throw new Error("The spreadsheet has no sheets.");
  }
  return periods;
}

export async function extractFileHeaders(file: File): Promise<string[]> {
  if (!isSupportedUploadFile(file.name)) {
    throw new Error(unsupportedUploadMessage(file.name));
  }

  if (isDelimitedUpload(file.name)) {
    const text = await file.text();
    const rows = await parseDelimitedText(text, file.name);
    const headers = Object.keys(rows[0] ?? {}).filter(Boolean);
    if (!headers.length) {
      throw new Error(`Could not read column headers from ${file.name}.`);
    }
    return headers;
  }

  if (isSpreadsheetUpload(file.name)) {
    const workbook = await readExcelWorkbook(file);
    return excelHeadersFromWorkbook(workbook);
  }

  throw new Error(unsupportedUploadMessage(file.name));
}

export async function validateMatchingFileHeaders(files: File[]) {
  if (!files.length) {
    throw new Error("Select at least one file.");
  }

  const signatures = await Promise.all(
    files.map(async (file) => ({
      fileName: file.name,
      signature: headerSignature(await extractFileHeaders(file)),
    }))
  );

  const reference = signatures[0];
  const mismatch = signatures.find((entry) => entry.signature !== reference.signature);
  if (mismatch) {
    throw new Error(
      `Column headers do not match across files. "${mismatch.fileName}" uses a different format than "${reference.fileName}". All statements must use the same columns (Merchant, Category, Amount, etc.). Please fix the format and upload again.`
    );
  }
}

function periodLabelFromFileName(file: File) {
  return periodLabelFromUploadFileName(file.name);
}

function normalizeFilePeriods(file: File, periods: Record<string, Transaction[]>) {
  const keys = Object.keys(periods);
  if (keys.length === 1 && keys[0] === "Period 1") {
    return { [periodLabelFromFileName(file)]: periods["Period 1"] };
  }
  return periods;
}

function mergePeriodMaps(maps: Record<string, Transaction[]>[]) {
  const merged: Record<string, Transaction[]> = {};
  let id = 0;

  for (const map of maps) {
    for (const [periodName, rows] of Object.entries(map)) {
      if (merged[periodName]) {
        throw new Error(
          `Duplicate period "${periodName}" found across uploads. Use unique period names, filenames, or a Period column.`
        );
      }
      merged[periodName] = rows.map((row, index) => ({
        ...row,
        id: id + index,
      }));
      id += rows.length;
    }
  }

  return merged;
}

function mapRows(rows: Record<string, unknown>[]): RawRow[] {
  if (!rows.length) throw new Error("A period cannot be empty.");

  const headers = Object.keys(rows[0]);
  const columnMap: Record<string, keyof RawRow> = {};
  for (const header of headers) {
    const alias = COLUMN_ALIASES[normalizeHeader(header)];
    if (alias) columnMap[header] = alias;
  }

  const mappedKeys = new Set(Object.values(columnMap));
  if (!mappedKeys.has("merchant_name") || !mappedKeys.has("category") || !mappedKeys.has("amount")) {
    throw new Error("Each period must include Merchant, Category, and Amount columns.");
  }

  return rows.map((row) => {
    const mapped: Partial<RawRow> = {};
    for (const [header, key] of Object.entries(columnMap)) {
      mapped[key] = String(row[header] ?? "").trim() as never;
    }
    const amount = Number(mapped.amount);
    if (!mapped.merchant_name || !mapped.category) {
      throw new Error("Merchant and Category cannot be blank.");
    }
    if (Number.isNaN(amount)) throw new Error("Amount must be a valid number on every row.");
    if (amount === 0) throw new Error("Amount cannot be zero.");
    return {
      merchant_name: mapped.merchant_name!,
      category: mapped.category!,
      amount,
      date: mapped.date,
      period: mapped.period ?? "",
    };
  });
}

export function classifyTransactions(rows: RawRow[], periodName: string, startId = 0): Transaction[] {
  return rows.map((row, index) => {
    const transaction_type = resolveTransactionType(row.category);
    return {
      id: startId + index,
      merchant_name: row.merchant_name,
      category: row.category,
      amount: row.amount,
      date: row.date,
      period: row.period || periodName,
      transaction_type,
      abs_amount: Math.abs(row.amount),
    };
  });
}

function parseSheetRows(rows: Record<string, unknown>[], periodName: string, startId: number) {
  const mapped = mapRows(rows);
  return classifyTransactions(mapped, periodName, startId);
}

/** Periods: Period column, else month buckets from Date (single file only), else one bucket per file/sheet. */
function splitCsvPeriods(rows: Record<string, unknown>[], allowDateSplit = true) {
  const headers = Object.keys(rows[0] ?? {});
  const normalized = Object.fromEntries(headers.map((header) => [normalizeHeader(header), header]));

  if (normalized.period) {
    const periodHeader = normalized.period;
    const groups = new Map<string, Record<string, unknown>[]>();
    for (const row of rows) {
      const key = String(row[periodHeader] ?? "Period").trim() || "Period";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(row);
    }
    const periods: Record<string, Transaction[]> = {};
    let id = 0;
    for (const [periodName, groupRows] of groups) {
      const withoutPeriod = groupRows.map((row) => {
        const copy = { ...row };
        delete copy[periodHeader];
        return copy;
      });
      periods[periodName] = parseSheetRows(withoutPeriod, periodName, id);
      id += periods[periodName].length;
    }
    return periods;
  }

  if (allowDateSplit && normalized.date) {
    const mapped = mapRows(rows);
    const monthBuckets = new Map<string, RawRow[]>();
    const undated: RawRow[] = [];

    for (const row of mapped) {
      if (!row.date?.trim()) {
        undated.push(row);
        continue;
      }
      const monthKey = periodKeyFromDate(row.date);
      if (!monthKey) {
        undated.push(row);
        continue;
      }
      const bucket = monthBuckets.get(monthKey) ?? [];
      bucket.push(row);
      monthBuckets.set(monthKey, bucket);
    }

    if (monthBuckets.size > 1) {
      const periods: Record<string, Transaction[]> = {};
      let id = 0;
      for (const month of [...monthBuckets.keys()].sort()) {
        periods[month] = classifyTransactions(monthBuckets.get(month)!, month, id);
        id += periods[month].length;
      }
      if (undated.length) {
        periods.Undated = classifyTransactions(undated, "Undated", id);
      }
      return periods;
    }
  }

  return { "Period 1": parseSheetRows(rows, "Period 1", 0) };
}

type ParseFileOptions = {
  /** Split one CSV into month periods from the Date column. Disabled when uploading multiple files. */
  allowDateSplit?: boolean;
};

export async function parseUploadedFile(
  file: File,
  options: ParseFileOptions = {}
): Promise<Record<string, Transaction[]>> {
  const allowDateSplit = options.allowDateSplit ?? true;

  if (!isSupportedUploadFile(file.name)) {
    throw new Error(unsupportedUploadMessage(file.name));
  }

  if (isDelimitedUpload(file.name)) {
    const text = await file.text();
    const rows = await parseDelimitedText(text, file.name);
    return splitCsvPeriods(rows, allowDateSplit);
  }

  if (isSpreadsheetUpload(file.name)) {
    const workbook = await readExcelWorkbook(file);
    return parseExcelWorkbook(workbook);
  }

  throw new Error(unsupportedUploadMessage(file.name));
}

export async function parseUploadedFiles(files: File[]): Promise<Record<string, Transaction[]>> {
  if (!files.length) {
    throw new Error("Select at least one file.");
  }

  await validateMatchingFileHeaders(files);

  const allowDateSplit = files.length === 1;
  const periodMaps = await Promise.all(
    files.map(async (file) =>
      normalizeFilePeriods(file, await parseUploadedFile(file, { allowDateSplit }))
    )
  );

  return mergePeriodMaps(periodMaps);
}
