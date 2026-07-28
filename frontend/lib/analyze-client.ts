import { rebuildAnalyzeResponse } from "@/lib/rebuild";
import { parseUploadedFile, parseUploadedFiles } from "@/lib/parser";
import { AnalyzeResponse } from "@/lib/types";

export async function analyzeFilesInBrowser(files: File[]): Promise<AnalyzeResponse> {
  const periodRows = await parseUploadedFiles(files);
  const uploadPeriods = Object.keys(periodRows);
  return rebuildAnalyzeResponse(periodRows, uploadPeriods);
}

export async function analyzeFileInBrowser(file: File): Promise<AnalyzeResponse> {
  const periodRows = await parseUploadedFile(file);
  const uploadPeriods = Object.keys(periodRows);
  return rebuildAnalyzeResponse(periodRows, uploadPeriods);
}
