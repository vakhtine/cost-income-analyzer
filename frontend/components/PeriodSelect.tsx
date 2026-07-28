"use client";

import { AVERAGE_PERIOD_LABEL } from "@/lib/rebuild";

type Props = {
  periods: string[];
  value: string;
  onChange: (period: string) => void;
  label?: string;
  className?: string;
  disabled?: boolean;
  includeCombined?: boolean;
};

export function PeriodSelect({
  periods,
  value,
  onChange,
  label = "Period",
  className = "analyze-period-label",
  disabled = false,
  includeCombined = true,
}: Props) {
  return (
    <label className={className}>
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled}>
        {periods.map((period) => (
          <option key={period} value={period}>
            {period}
          </option>
        ))}
        {includeCombined && periods.length > 1 && (
          <>
            <option value="All periods">All periods</option>
            <option value={AVERAGE_PERIOD_LABEL}>Average (all periods)</option>
          </>
        )}
      </select>
    </label>
  );
}
