"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { IconUpload } from "@/components/Icons";
import { StatementSanitizerPanel } from "@/components/StatementSanitizerPanel";
import {
  isSupportedUploadFile,
  SUPPORTED_UPLOAD_ACCEPT,
  SUPPORTED_UPLOAD_LABEL,
  unsupportedUploadMessage,
} from "@/lib/upload-formats";

const FILE_INPUT_ID = "statement-file-upload";

type Props = {
  onUpload: (files: File[]) => void;
  loading?: boolean;
  error?: string;
  onError?: (message: string) => void;
};

function pickSupportedFiles(fileList: FileList | File[] | null | undefined) {
  if (!fileList) return [];
  return Array.from(fileList).filter((file) => isSupportedUploadFile(file.name));
}

export function UploadZone({ onUpload, loading, error, onError }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [mounted, setMounted] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [sampleLoading, setSampleLoading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleFiles = useCallback(
    (fileList: FileList | File[] | null | undefined) => {
      if (loading) return;

      const files = pickSupportedFiles(fileList);
      if (!files.length) {
        onError?.(unsupportedUploadMessage());
        return;
      }

      onError?.("");
      setSelectedFiles(files.map((file) => file.name));
      onUpload(files);
    },
    [loading, onError, onUpload]
  );

  function openFilePicker() {
    if (loading) return;
    inputRef.current?.click();
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    handleFiles(event.dataTransfer.files);
  }

  async function loadSampleData() {
    if (loading || sampleLoading) return;
    setSampleLoading(true);
    onError?.("");
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

  const fileInput = (
    <input
      id={FILE_INPUT_ID}
      ref={inputRef}
      type="file"
      accept={SUPPORTED_UPLOAD_ACCEPT}
      multiple
      disabled={loading}
      tabIndex={-1}
      aria-hidden="true"
      className="upload-file-input"
      onChange={(event) => {
        handleFiles(event.target.files);
        event.target.value = "";
      }}
    />
  );

  return (
    <section className="upload-zone card upload-zone-home">
      <p className="eyebrow">Upload</p>
      <h2>Upload your statements</h2>
      <p className="plain">
        One or more files, same column headers. Each file can represent a month. No bank login,
        ever. Supported formats: {SUPPORTED_UPLOAD_LABEL}.
      </p>

      <StatementSanitizerPanel />

      {error ? <div className="error upload-zone-error">{error}</div> : null}

      {mounted ? createPortal(fileInput, document.body) : null}

      <div
        className={`drop-area template-dropzone ${dragging ? "dragging" : ""} ${loading ? "disabled" : ""}`}
        onDragOver={(event) => {
          event.preventDefault();
          if (!loading) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        <div className="drop-icon-wrap template-drop-ico" aria-hidden="true">
          <IconUpload size={34} />
        </div>
        <div className="drop-title">
          {loading ? "Analyzing your files..." : "Drag & drop your files here"}
        </div>
        <div className="drop-hint">or use the button below · {SUPPORTED_UPLOAD_LABEL}</div>
        <button
          type="button"
          className="upload-browse-btn"
          disabled={loading}
          onClick={openFilePicker}
        >
          {loading ? "Analyzing..." : "Browse files"}
        </button>
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
          className="sample-link-btn"
          disabled={loading || sampleLoading}
          onClick={loadSampleData}
        >
          {sampleLoading ? "Loading sample..." : "Try sample data instead — nothing is saved →"}
        </button>
      </div>

      <div className="privacy-strip">
        Nothing you upload is stored on a server. Refresh the page and session data is gone.
      </div>
    </section>
  );
}
