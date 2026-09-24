"use client";

import { useMemo } from "react";
import { SectionDetailToggle } from "@/components/SectionDetailToggle";
import { useCompositeDetails } from "@/lib/plain-language-context";
import {
  CompositeScoreEntry,
  HEALTH_SCORE_WEIGHT_ITEMS,
  RELOCATION_COMPOSITE_FOOTNOTE,
  RELOCATION_FIT_CONTEXT_ITEMS,
  RELOCATION_FIT_SCORE_LABEL,
  RELOCATION_SCORES_COMPARISON_NOTE,
  SCENARIO_ADJUSTED_HEALTH_SCORE_DATA_NOTE,
  SCENARIO_ADJUSTED_HEALTH_SCORE_LABEL,
} from "@/lib/relocation-composite";
import { formatHealthScore } from "@/lib/health-score";
import { scoreBandLabel } from "@/lib/report-charts";
import { REPORT_CHART_COLORS } from "@/lib/report-theme";

function ScoreGauge({
  label,
  score,
  color,
}: {
  label: string;
  score: number;
  color: string;
}) {
  const clamped = Math.max(0, Math.min(100, score));
  const band = scoreBandLabel(clamped, "health");
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
          {formatHealthScore(clamped)}
        </text>
      </svg>
      <span className="composite-gauge-label">{label}</span>
      <span className="composite-gauge-band">{band}</span>
      <span className="composite-gauge-type">{SCENARIO_ADJUSTED_HEALTH_SCORE_LABEL}</span>
    </div>
  );
}

type Props = {
  entries: CompositeScoreEntry[];
  customBenchmarksActive?: boolean;
};

export function CompositeScoresPanel({ entries, customBenchmarksActive = false }: Props) {
  const { showDetails, toggleDetails } = useCompositeDetails();
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

  const formatWeightPct = (weight: number) => `${Math.round(weight * 100)}%`;

  const formatRelocationContext = (entry: CompositeScoreEntry) => {
    const costLabel =
      entry.costVsHomePct > 0
        ? `−${entry.costVsHomePct.toFixed(0)}% cost vs. home`
        : entry.costVsHomePct < 0
          ? `+${Math.abs(entry.costVsHomePct).toFixed(0)}% cost vs. home`
          : "0% cost vs. home";
    const runwayLabel =
      entry.savingsRunwayMonths !== null
        ? `${entry.savingsRunwayMonths.toFixed(1)} mo savings runway`
        : "Savings runway n/a";
    return `${costLabel} · ${Math.round(entry.purchasingPowerIndex)} purchasing power · ${runwayLabel}`;
  };

  return (
    <section className="card composite-scores-panel">
      <div className="section-card-top section-card-top-stack">
        <div className="section-card-top-copy">
          <p className="section-kicker">Financial health &amp; relocation fit</p>
          <h3>Composite scores — illustrative weighting, not a guarantee</h3>
        </div>
        <SectionDetailToggle
          enabled={showDetails}
          onToggle={toggleDetails}
          label="Show details"
          title="Show or hide score calculations and weighting explanations"
        />
      </div>

      <p className="explanatory-callout composite-scores-comparison-note">
        {RELOCATION_SCORES_COMPARISON_NOTE}
      </p>

      {showDetails ? (
        <>
          <div className="composite-weights-panel">
            <div className="composite-weights-block">
              <h4 className="composite-weights-title">{SCENARIO_ADJUSTED_HEALTH_SCORE_LABEL} weights</h4>
              <p className="composite-weights-note">
                Applies to the donut gauges above — not the {RELOCATION_FIT_SCORE_LABEL.toLowerCase()}{" "}
                on city cards.
              </p>
              <p className="composite-weights-note composite-weights-data-note">
                {SCENARIO_ADJUSTED_HEALTH_SCORE_DATA_NOTE}
              </p>
              <ul className="composite-weights-list">
                {HEALTH_SCORE_WEIGHT_ITEMS.map((item) => (
                  <li key={item.label}>
                    <span>{item.label}</span>
                    <strong>{formatWeightPct(item.weight)}</strong>
                  </li>
                ))}
              </ul>
            </div>
            <div className="composite-weights-block">
              <h4 className="composite-weights-title">{RELOCATION_FIT_SCORE_LABEL} factors</h4>
              <p className="composite-weights-note">
                City cards use these destination comparisons (shown under each card) to explain
                relocation fit alongside the score.
              </p>
              <ul className="composite-weights-list composite-context-list">
                {RELOCATION_FIT_CONTEXT_ITEMS.map((item) => (
                  <li key={item.label}>
                    <span className="composite-context-label">{item.label}</span>
                    <span className="composite-context-desc">{item.description}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <p className="explanatory-callout metric-hint">
            Gauges use the health score weights above. City cards show {RELOCATION_FIT_SCORE_LABEL.toLowerCase()}{" "}
            with cost vs. home, purchasing power, and savings runway. Tier bands: Excellent 85+, Good 65+,
            Reasonable 50+.
          </p>
          {customBenchmarksActive ? (
            <p className="explanatory-callout composite-custom-benchmarks-note">
              Custom category amounts are active — scores below reflect your edited destination
              costs, not the original public-source defaults.
            </p>
          ) : null}
        </>
      ) : null}

      <div className="composite-gauge-grid">
        {displayEntries.map((entry, index) => (
          <ScoreGauge
            key={entry.city}
            label={entry.isHome ? `Home — ${entry.cityShort}` : entry.cityShort}
            score={entry.financialHealthScore}
            color={REPORT_CHART_COLORS[index % REPORT_CHART_COLORS.length]}
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
            </div>
            <span className="composite-score-type-inline">{RELOCATION_FIT_SCORE_LABEL}</span>
            <div className="composite-city-score-row">
              <div className="composite-city-score">{formatHealthScore(entry.relocationLikelihoodScore)}</div>
              {entry.isBestFit ? <span className="composite-best-fit">Best fit</span> : null}
            </div>
            <span className="composite-gauge-band">
              {scoreBandLabel(entry.relocationLikelihoodScore, "relocation")}
            </span>
            {showDetails ? (
              <p className="composite-city-component-scores">{formatRelocationContext(entry)}</p>
            ) : null}
          </article>
        ))}
      </div>

      {showDetails && bestReason ? (
        <p className="explanatory-callout composite-rank-note">{bestReason}</p>
      ) : null}
      {showDetails ? (
        <p className="explanatory-callout composite-footnote">{RELOCATION_COMPOSITE_FOOTNOTE}</p>
      ) : null}
    </section>
  );
}
