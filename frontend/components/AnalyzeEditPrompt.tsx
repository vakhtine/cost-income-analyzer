"use client";

type Props = {
  onEdit: () => void;
  onContinue: () => void;
};

export function AnalyzeEditPrompt({ onEdit, onContinue }: Props) {
  return (
    <section className="card analyze-edit-prompt">
      <h3>Need to change any transactions?</h3>
      <p>
        If categories, amounts, or merchants look wrong, you can go back to the Clean step to edit
        your records before reviewing health scores and reports.
      </p>
      <div className="analyze-edit-prompt-actions">
        <button type="button" className="tab active" onClick={onEdit}>
          Yes, edit transactions
        </button>
        <button type="button" className="tab" onClick={onContinue}>
          No, continue with analysis
        </button>
      </div>
    </section>
  );
}
