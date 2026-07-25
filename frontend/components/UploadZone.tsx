"use client";

import { useRef, useState } from "react";
import { PrivacyFlow } from "@/components/HeroSection";
import { IconUpload } from "@/components/Icons";
import { StatementSanitizerPanel } from "@/components/StatementSanitizerPanel";

type Props = {
  onUpload: (files: File[]) => void;
  loading?: boolean;
  onError?: (message: string) => void;
};

function pickSupportedFiles(fileList: FileList | File[] | null | undefined) {
  if (!fileList) return [];
  return Array.from(fileList).filter((file) => /\.(csv|xlsx)$/i.test(file.name));
}

export function UploadZone({ onUpload, loading, onError }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [sampleLoading, setSampleLoading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);

  function handleFiles(fileList: FileList | File[] | null | undefined) {
    if (loading) return;

    const files = pickSupportedFiles(fileList);
    if (!files.length) {
      onError?.("Upload one or more .csv or .xlsx files with matching column headers.");
      return;
    }

    setSelectedFiles(files.map((file) => file.name));
    onUpload(files);
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    handleFiles(event.dataTransfer.files);
  }

  async function loadSampleData() {
    if (loading || sampleLoading) return;
    setSampleLoading(true);
    try {
      const response = await fetch("/sample_transactions.csv");
      if (!response.ok) throw new Error("Could not load sample file.");
      const blob = await response.blob();
      const file = new File([blob], "sample_transactions.csv", { type: "text/csv" });
      setSelectedFiles([file.name]);
      onUpload([file]);
    } catch {
      onError?.("Could not load sample data. Please upload your own file.");
    } finally {
      setSampleLoading(false);
    }
  }

  return (
    <section className="upload-zone card upload-zone-home">
      <h2>Upload your statements</h2>
      <p className="upload-subtitle">
        Upload one or more CSV or Excel files with the <strong>same column headers</strong>{" "}
        (<strong>Merchant</strong>, <strong>Category</strong>, <strong>Amount</strong>, and{" "}
        <strong>Date</strong> optional — highly recommended for more detailed analysis and reports).
        Each file can represent a separate month. No bank login required.
      </p>

      <StatementSanitizerPanel />

      <div
        className={`drop-area ${dragging ? "dragging" : ""} ${loading ? "disabled" : ""}`}
        onDragOver={(event) => {
          event.preventDefault();
          if (!loading) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => !loading && inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            inputRef.current?.click();
          }
        }}
      >
        <div className="drop-icon-wrap">
          <IconUpload size={34} />
        </div>
        <div className="drop-title">
          {loading ? "Analyzing your files..." : "Drag & drop your files here"}
        </div>
        <div className="drop-hint">or click to browse · multiple .csv · .xlsx</div>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.xlsx"
          multiple
          hidden
          onChange={(event) => {
            handleFiles(event.target.files);
            event.target.value = "";
          }}
        />
      </div>

      {selectedFiles.length > 0 && !loading && (
        <ul className="upload-file-list">
          {selectedFiles.map((name) => (
            <li key={name}>{name}</li>
          ))}
        </ul>
      )}

      <div className="upload-actions">
        <button
          type="button"
          className="tab"
          disabled={loading || sampleLoading}
          onClick={(event) => {
            event.stopPropagation();
            loadSampleData();
          }}
        >
          {sampleLoading ? "Loading sample..." : "Try sample data"}
        </button>
        <span className="upload-note">Instant demo — nothing is saved</span>
      </div>

      <PrivacyFlow />
      <p className="privacy-flow-note">
        Data never leaves your device. We only read Merchant, Category, and Amount — not full bank
        statements.
      </p>
    </section>
  );
}
