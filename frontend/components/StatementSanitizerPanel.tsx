import { IconExcel, IconFile } from "@/components/Icons";
import {
  STATEMENT_SANITIZER,
  STATEMENT_SANITIZER_DOWNLOADS,
  STATEMENT_SANITIZER_PRIVACY,
  STATEMENT_SANITIZER_STEPS,
  SanitizerDownload,
} from "@/lib/statement-sanitizer";

function DownloadIcon({ kind }: { kind: SanitizerDownload["kind"] }) {
  if (kind === "excel") {
    return <IconExcel size={28} />;
  }

  return <IconFile size={28} className={`sanitizer-file-icon sanitizer-file-icon-${kind}`} />;
}

export function StatementSanitizerPanel() {
  return (
    <section className="excel-sanitizer-panel" aria-labelledby="excel-sanitizer-title">
      <div className="excel-sanitizer-header">
        <div className="excel-sanitizer-icon-wrap">
          <IconExcel size={34} />
        </div>
        <div>
          <h3 id="excel-sanitizer-title">{STATEMENT_SANITIZER.title}</h3>
          <p className="excel-sanitizer-lead">{STATEMENT_SANITIZER.description}</p>
        </div>
      </div>

      <div className="excel-sanitizer-instructions">
        <h4>How to use it</h4>
        <ol>
          {STATEMENT_SANITIZER_STEPS.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </div>

      <div className="excel-sanitizer-downloads">
        <h4 className="excel-sanitizer-downloads-heading">Downloads</h4>
        {STATEMENT_SANITIZER_DOWNLOADS.map((item) => (
          <div key={item.id} className="excel-sanitizer-download-card">
            <div className="excel-sanitizer-file-meta">
              <DownloadIcon kind={item.kind} />
              <div>
                <strong>{item.label}</strong>
                <span className="excel-sanitizer-file-note">{item.note}</span>
                <span className="excel-sanitizer-file-name">{item.fileName}</span>
              </div>
            </div>
            <a
              className="tab active excel-sanitizer-download-btn"
              href={item.publicPath}
              download={item.fileName}
            >
              {item.buttonLabel}
            </a>
          </div>
        ))}
      </div>

      <p className="excel-sanitizer-privacy">{STATEMENT_SANITIZER_PRIVACY}</p>
    </section>
  );
}
