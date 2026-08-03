"use client";

import {
  PurchasingPowerIndexEntry,
  topPurchasingPowerExample,
} from "@/lib/relocation-composite";

const BAR_COLORS = ["#4a5568", "#1a6b7c", "#b85c38", "#c9a227", "#2d6a4f", "#6366f1"];

type Props = {
  homeCity: string;
  entries: PurchasingPowerIndexEntry[];
};

export function PurchasingPowerIndexPanel({ homeCity, entries }: Props) {
  if (entries.length < 2) return null;

  const maxIndex = Math.max(...entries.map((entry) => entry.index), 100);
  const example = topPurchasingPowerExample(entries, homeCity);

  return (
    <section className="card purchasing-power-index-panel">
      <p className="section-kicker">Purchasing power index</p>
      <h3>Same income, indexed against home cost of living (home = 100)</h3>
      <p className="explanatory-callout metric-hint">
        Index bars update when you edit destination category costs in the table above.
      </p>

      <div className="pp-index-chart" aria-label="Purchasing power index by city">
        {entries.map((entry, index) => {
          const widthPct = Math.max(8, (entry.index / maxIndex) * 100);
          return (
            <div key={entry.city} className="pp-index-row">
              <div className="pp-index-label">{entry.isHome ? "Home" : entry.cityShort}</div>
              <div className="pp-index-bar-track">
                <div
                  className="pp-index-bar"
                  style={{
                    width: `${widthPct}%`,
                    background: BAR_COLORS[index % BAR_COLORS.length],
                  }}
                />
                {entry.isHome ? (
                  <span className="pp-index-baseline">home = 100</span>
                ) : null}
              </div>
              <div className="pp-index-value">{Math.round(entry.index)}</div>
            </div>
          );
        })}
      </div>

      {example ? <p className="pp-index-note">{example}</p> : null}
    </section>
  );
}
