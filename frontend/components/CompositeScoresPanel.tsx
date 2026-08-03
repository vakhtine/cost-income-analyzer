"use client";

import { useMemo } from "react";
import {
  CompositeScoreEntry,
  RELOCATION_COMPOSITE_FOOTNOTE,
} from "@/lib/relocation-composite";

const GAUGE_COLORS = ["#4a5568", "#1a6b7c", "#b85c38", "#c9a227", "#2d6a4f", "#6366f1"];

function ScoreGauge({
  label,
  score,
  color,
  scoreType,
}: {
  label: string;
  score: number;
  color: string;
  scoreType: string;
}) {
  const clamped = Math.max(0, Math.min(100, score));
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className="composite-gauge">
      <svg width="110" height="110" viewBox="0 0 110 110" aria-hidden="true">
        <circle cx="55" cy="55" r={radius} fill="none" stroke="#eef4f6" strokeWidth="10" />
        <circle
          cx="55"
          cy="55"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 55 55)"
          strokeLinecap="round"
        />
        <text x="55" y="58" textAnchor="middle" className="composite-gauge-value">
          {Math.round(clamped)}
        </text>
      </svg>
      <span className="composite-gauge-label">{label}</span>
      <span className="composite-gauge-type">{scoreType}</span>
    </div>
  );
}

type Props = {
  entries: CompositeScoreEntry[];
  customBenchmarksActive?: boolean;
};

export function CompositeScoresPanel({ entries, customBenchmarksActive = false }: Props) {
  const displayEntries = useMemo(() => {
    let homeSeen = false;
    return entries.filter((entry) => {
      if (entry.isHome) {
        if (homeSeen) return false;
        homeSeen = true;
        return true;
      }
      return !entries.some((home) => home.isHome && home.city === entry.city);
    });
  }, [entries]);

  const destinations = displayEntries.filter((entry) => !entry.isHome);
  if (!destinations.length) return null;

  const bestReason = destinations.find((entry) => entry.rankReason)?.rankReason;

  return (
    <section className="card composite-scores-panel">
      <p className="section-kicker">Financial health &amp; relocation fit</p>
      <h3>Composite scores — illustrative weighting, not a guarantee</h3>
      <p className="explanatory-callout metric-hint">
        <strong>Financial health score</strong> (donut gauges) reflects your overall money picture
        at home and in each destination using the same four-factor model as Analyze — savings rate,
        income stability, expense stability, and non-essential control — with what-if income applied
        to savings rate and discretionary spending ratios. Destination scores use each city&apos;s
        estimated monthly cost from the category table (including any amounts you edit).{" "}
        <strong>Relocation fit score</strong> (city cards below) ranks destinations using the
        following weights: cost savings 40%, purchasing power 35%, and savings runway improvement
        25% — also driven by those category totals.
      </p>
      {customBenchmarksActive ? (
        <p className="explanatory-callout composite-custom-benchmarks-note">
          Custom category amounts are active — scores below reflect your edited destination costs,
          not the original public-source defaults.
        </p>
      ) : null}

      <div className="composite-gauge-grid">
        {displayEntries.map((entry, index) => (
          <ScoreGauge
            key={entry.city}
            label={entry.isHome ? `Home — ${entry.cityShort}` : entry.cityShort}
            score={entry.financialHealthScore}
            color={GAUGE_COLORS[index % GAUGE_COLORS.length]}
            scoreType="Financial health score"
          />
        ))}
      </div>

      <div className="composite-card-grid">
        {destinations.map((entry) => (
          <article
            key={entry.city}
            className={`composite-city-card${entry.isBestFit ? " composite-city-card-best" : ""}`}
          >
            <div className="composite-city-card-head">
              <strong>{entry.city}</strong>
              {entry.isBestFit ? <span className="composite-best-fit">Best fit</span> : null}
            </div>
            <div className="composite-city-score">{entry.relocationLikelihoodScore}</div>
            <p className="composite-score-type">Relocation fit score</p>
            <p className="composite-city-metrics">
              {entry.costVsHomePct > 0
                ? `−${entry.costVsHomePct.toFixed(0)}% cost vs. home`
                : entry.costVsHomePct < 0
                  ? `+${Math.abs(entry.costVsHomePct).toFixed(0)}% cost vs. home`
                  : "0% cost vs. home"}{" "}
              · {Math.round(entry.purchasingPowerIndex)} purchasing power
              {entry.savingsRunwayMonths !== null
                ? ` · ${entry.savingsRunwayMonths.toFixed(1)} mo savings runway`
                : ""}
            </p>
          </article>
        ))}
      </div>

      {bestReason ? <p className="explanatory-callout composite-rank-note">{bestReason}</p> : null}
      <p className="explanatory-callout composite-footnote">{RELOCATION_COMPOSITE_FOOTNOTE}</p>
    </section>
  );
}
