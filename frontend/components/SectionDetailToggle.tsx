"use client";

type Props = {
  enabled: boolean;
  onToggle: () => void;
  label: string;
  title?: string;
};

export function SectionDetailToggle({ enabled, onToggle, label, title }: Props) {
  return (
    <button
      type="button"
      className={`section-detail-toggle ${enabled ? "is-on" : ""}`}
      onClick={onToggle}
      aria-pressed={enabled}
      title={title ?? label}
    >
      <span className="section-detail-toggle-track" aria-hidden="true">
        <span className="section-detail-toggle-thumb" />
      </span>
      <span className="section-detail-toggle-copy">
        <span className="section-detail-toggle-label">{label}</span>
        <span className="section-detail-toggle-state">{enabled ? "On" : "Off"}</span>
      </span>
    </button>
  );
}
