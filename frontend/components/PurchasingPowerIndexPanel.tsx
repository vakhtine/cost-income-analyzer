"use client";

import { SectionDetailToggle } from "@/components/SectionDetailToggle";
import { usePurchasingPowerDetails } from "@/lib/plain-language-context";
import {
  PurchasingPowerIndexEntry,
  topPurchasingPowerExample,
} from "@/lib/relocation-composite";
import { REPORT_CHART_COLORS } from "@/lib/report-theme";

type Props = {
  homeCity: string;
  entries: PurchasingPowerIndexEntry[];
};

export function PurchasingPowerIndexPanel({ homeCity, entries }: Props) {
  const { showDetails, toggleDetails } = usePurchasingPowerDetails();

  if (entries.length < 2) return null;

  const maxIndex = Math.max(...entries.map((entry) => entry.index), 100);
  const example = topPurchasingPowerExample(entries, homeCity);

  return (
    <section className="card purchasing-power-index-panel">
      <div className="section-card-top section-card-top-stack">
        <div className="section-card-top-copy">
          <p className="section-kicker">Purchasing power index</p>
          <h3>Destination costs indexed against your spending total (home = 100)</h3>
        </div>
        <SectionDetailToggle
          enabled={showDetails}
          onToggle={toggleDetails}
          label="Show details"
          title="Show or hide purchasing power calculation notes"
        />
      </div>

      {showDetails ? (
        <p className="explanatory-callout metric-hint">
          Uses the same home baseline as cost vs. home — your spending row total from the category
          table. Index bars update when you edit destination costs above. A value above 100 means
          destination projected costs are lower than your current spending; below 100 means higher.
        </p>
      ) : null}

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
                    background: REPORT_CHART_COLORS[index % REPORT_CHART_COLORS.length],
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

      {showDetails && example ? <p className="pp-index-note">{example}</p> : null}
    </section>
  );
}
