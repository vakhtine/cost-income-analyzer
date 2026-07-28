"use client";

type Props = {
  periods: string[];
  excludedPeriods: string[];
  onExcludedChange: (periods: string[]) => void;
  onContinue: () => void;
  onBack: () => void;
};

export function PeriodExclusionPanel({
  periods,
  excludedPeriods,
  onExcludedChange,
  onContinue,
  onBack,
}: Props) {
  function togglePeriod(period: string) {
    if (excludedPeriods.includes(period)) {
      onExcludedChange(excludedPeriods.filter((item) => item !== period));
      return;
    }
    if (excludedPeriods.length >= periods.length - 1) return;
    onExcludedChange([...excludedPeriods, period]);
  }

  return (
    <section className="card period-exclusion-panel">
      <h3>Exclude periods from analysis?</h3>
      <p>
        Some months may have incomplete data or one-off transactions that should not affect your
        health score, trends, or reports. Select any periods to omit from all metrics and PDF
        exports.
      </p>
      <div className="period-exclusion-list">
        {periods.map((period) => {
          const excluded = excludedPeriods.includes(period);
          const disabled =
            !excluded && excludedPeriods.length >= periods.length - 1;
          return (
            <label key={period} className={`period-exclusion-item${excluded ? " excluded" : ""}`}>
              <input
                type="checkbox"
                checked={excluded}
                disabled={disabled}
                onChange={() => togglePeriod(period)}
              />
              <span>{period}</span>
              {excluded ? <span className="period-exclusion-tag">Excluded</span> : null}
            </label>
          );
        })}
      </div>
      {excludedPeriods.length > 0 ? (
        <p className="insight">
          {excludedPeriods.length} period{excludedPeriods.length === 1 ? "" : "s"} will be omitted
          from analysis.
        </p>
      ) : (
        <p className="insight">All periods will be included unless you check one above.</p>
      )}
      <div className="wizard-nav">
        <button type="button" className="tab" onClick={onBack}>
          Back
        </button>
        <button type="button" className="tab active" onClick={onContinue}>
          Continue to Analyze
        </button>
      </div>
    </section>
  );
}
