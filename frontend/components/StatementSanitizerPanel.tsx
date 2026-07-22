import { IconExcel } from "@/components/Icons";
import {
  STATEMENT_SANITIZER,
  STATEMENT_SANITIZER_PRIVACY,
  STATEMENT_SANITIZER_STEPS,
} from "@/lib/statement-sanitizer";

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

      <div className="excel-sanitizer-download-card">
        <div className="excel-sanitizer-file-meta">
          <IconExcel size={28} />
          <div>
            <strong>{STATEMENT_SANITIZER.fileName}</strong>
            <span className="excel-sanitizer-file-note">
              Macro-enabled Excel workbook · download from this page
            </span>
          </div>
        </div>
        <a
          className="tab active excel-sanitizer-download-btn"
          href={STATEMENT_SANITIZER.publicPath}
          download={STATEMENT_SANITIZER.fileName}
        >
          Download Excel file
        </a>
      </div>

      <p className="excel-sanitizer-privacy">{STATEMENT_SANITIZER_PRIVACY}</p>
    </section>
  );
}
