"use client";

type Props = {
  periods: string[];
  startIndex: number;
  endIndex: number;
  onChange: (startIndex: number, endIndex: number) => void;
  disabled?: boolean;
};

export function PeriodRangeSlider({
  periods,
  startIndex,
  endIndex,
  onChange,
  disabled = false,
}: Props) {
  if (periods.length < 2) {
    return (
      <p className="insight">Upload at least two periods to select a date range for reports.</p>
    );
  }

  const min = 0;
  const max = periods.length - 1;
  const left = Math.min(startIndex, endIndex);
  const right = Math.max(startIndex, endIndex);
  const leftPct = (left / max) * 100;
  const rightPct = (right / max) * 100;

  function handleStartChange(value: number) {
    onChange(Math.min(value, right), right);
  }

  function handleEndChange(value: number) {
    onChange(left, Math.max(value, left));
  }

  return (
    <div className={`period-range-slider ${disabled ? "disabled" : ""}`}>
      <div className="period-range-track-wrap">
        <div className="period-range-track">
          <div
            className="period-range-fill"
            style={{ left: `${leftPct}%`, width: `${rightPct - leftPct}%` }}
          />
        </div>
        <input
          type="range"
          className="period-range-thumb period-range-thumb-start"
          min={min}
          max={max}
          value={left}
          onChange={(event) => handleStartChange(Number(event.target.value))}
          disabled={disabled}
          aria-label="Range start period"
        />
        <input
          type="range"
          className="period-range-thumb period-range-thumb-end"
          min={min}
          max={max}
          value={right}
          onChange={(event) => handleEndChange(Number(event.target.value))}
          disabled={disabled}
          aria-label="Range end period"
        />
      </div>
      <div className="period-range-labels">
        {periods.map((period, index) => (
          <span
            key={period}
            className={`period-range-label ${index >= left && index <= right ? "active" : ""}`}
          >
            {period}
          </span>
        ))}
      </div>
      <p className="period-range-summary">
        Selected range: <strong>{periods[left]}</strong> to <strong>{periods[right]}</strong>
        {right - left + 1 > 1 ? ` (${right - left + 1} periods)` : ""}
      </p>
    </div>
  );
}
