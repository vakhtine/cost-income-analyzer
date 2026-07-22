import Papa from "papaparse";
import * as XLSX from "xlsx";
import { COLUMN_ALIASES, resolveTransactionType, RawRow } from "@/lib/constants";
import { Transaction } from "@/lib/types";

function normalizeHeader(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

function headerSignature(headers: string[]) {
  return [...headers].map(normalizeHeader).sort().join("\0");
}

export async function extractFileHeaders(file: File): Promise<string[]> {
  const lower = file.name.toLowerCase();
  if (lower.endsWith(".csv")) {
    const text = await file.text();
    const parsed = Papa.parse<Record<string, unknown>>(text, {
      header: true,
      preview: 1,
      skipEmptyLines: true,
    });
    const headers = parsed.meta.fields?.filter(Boolean) ?? [];
    if (!headers.length) {
      throw new Error(`Could not read column headers from ${file.name}.`);
    }
    return headers;
  }

  if (lower.endsWith(".xlsx")) {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      throw new Error(`${file.name} has no worksheets.`);
    }
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" });
    const headerRow = rows[0];
    if (!Array.isArray(headerRow)) {
      throw new Error(`Could not read column headers from ${file.name}.`);
    }
    const headers = headerRow.map((cell) => String(cell ?? "").trim()).filter(Boolean);
    if (!headers.length) {
      throw new Error(`Could not read column headers from ${file.name}.`);
    }
    return headers;
  }

  throw new Error(`${file.name}: upload a .csv or .xlsx file.`);
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
  return file.name.replace(/\.(csv|xlsx)$/i, "").trim() || file.name;
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

function monthKey(dateValue: string) {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return null;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function splitCsvPeriods(rows: Record<string, unknown>[]) {
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

  if (normalized.date) {
    const mapped = mapRows(rows);
    const dated = mapped.filter((row) => row.date);
    const months = new Set(
      dated
        .map((row) => monthKey(row.date!))
        .filter((month): month is string => Boolean(month))
    );
    if (months.size > 1) {
      const periods: Record<string, Transaction[]> = {};
      let id = 0;
      for (const month of [...months].sort()) {
        const monthRows = mapped.filter((row) => monthKey(row.date ?? "") === month);
        periods[month] = classifyTransactions(monthRows, month, id);
        id += periods[month].length;
      }
      const undated = mapped.filter((row) => !row.date);
      if (undated.length) {
        periods.Undated = classifyTransactions(undated, "Undated", id);
      }
      return periods;
    }
  }

  return { "Period 1": parseSheetRows(rows, "Period 1", 0) };
}

export async function parseUploadedFile(file: File): Promise<Record<string, Transaction[]>> {
  const lower = file.name.toLowerCase();
  if (lower.endsWith(".csv")) {
    const text = await file.text();
    const parsed = Papa.parse<Record<string, unknown>>(text, {
      header: true,
      skipEmptyLines: true,
    });
    if (parsed.errors.length) throw new Error("Could not read the CSV file.");
    return splitCsvPeriods(parsed.data);
  }

  if (lower.endsWith(".xlsx")) {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const periods: Record<string, Transaction[]> = {};
    let id = 0;
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
      const cleanName = sheetName.trim() || "Period";
      periods[cleanName] = parseSheetRows(rows, cleanName, id);
      id += periods[cleanName].length;
    }
    if (!Object.keys(periods).length) throw new Error("The Excel file has no sheets.");
    return periods;
  }

  throw new Error("Upload a .csv or .xlsx file.");
}

export async function parseUploadedFiles(files: File[]): Promise<Record<string, Transaction[]>> {
  if (!files.length) {
    throw new Error("Select at least one file.");
  }

  await validateMatchingFileHeaders(files);

  const periodMaps = await Promise.all(
    files.map(async (file) => normalizeFilePeriods(file, await parseUploadedFile(file)))
  );

  return mergePeriodMaps(periodMaps);
}
