import { CityAffordabilitySummary } from "@/lib/relocation-scenario";
import { CityFlag } from "@/components/CityFlag";
import { CompositeScoreEntry } from "@/lib/relocation-composite";
import { calculateCityRelocationReadiness } from "@/lib/relocation-profile";

type Props = {
  summaries: CityAffordabilitySummary[];
  formatAmount: (amount: number) => string;
  displayCurrency: string;
  compositeEntries?: CompositeScoreEntry[];
  savingsBalance: number | null;
  scenarioIncomeDisplay: number;
  customBenchmarksActive?: boolean;
};

export function CityCompareGrid({
  summaries,
  formatAmount,
  displayCurrency,
  compositeEntries = [],
  savingsBalance,
  scenarioIncomeDisplay,
  customBenchmarksActive = false,
}: Props) {
  if (!summaries.length) return null;

  const relocationFitByCity = new Map(
    compositeEntries
      .filter((entry) => !entry.isHome)
      .map((entry) => [entry.city, entry.relocationLikelihoodScore])
  );

  const financialHealthByCity = new Map(
    compositeEntries
      .filter((entry) => !entry.isHome)
      .map((entry) => [entry.city, entry.financialHealthScore])
  );

  const savingsRunwayByCity = new Map(
    compositeEntries
      .filter((entry) => !entry.isHome)
      .map((entry) => [entry.city, entry.savingsRunwayMonths])
  );

  const sorted = [...summaries].sort((a, b) => {
    const fitA = relocationFitByCity.get(a.city) ?? 0;
    const fitB = relocationFitByCity.get(b.city) ?? 0;
    if (fitB !== fitA) return fitB - fitA;
    const balanceDiff =
      b.affordability.projectedBalance - a.affordability.projectedBalance;
    if (balanceDiff !== 0) return balanceDiff;
    return (
      a.affordability.displayReferenceCost - b.affordability.displayReferenceCost
    );
  });

  return (
    <section className="card city-compare-grid">
      <div className="section-heading">
        <h3>Side-by-side city comparison</h3>
        <p>
          Ranked by relocation fit score in {displayCurrency} — same weights as the composite
          section (cost savings 40%, purchasing power 35%, savings runway improvement 25%).
          Readiness metrics update with your savings, what-if income, lifestyle, and any category
          cost edits in the table above.
        </p>
      </div>
      {customBenchmarksActive ? (
        <p className="explanatory-callout composite-custom-benchmarks-note">
          Scores use your customized category amounts — edit cells in the category table to see
          relocation fit and financial health change in real time.
        </p>
      ) : null}
      <div className="city-compare-cards">
        {sorted.map((entry, index) => {
          const cityName = entry.city.split(",")[0];
          const { affordability } = entry;
          const relocationFitScore =
            relocationFitByCity.get(entry.city) ?? affordability.score;
          const financialHealthScore = financialHealthByCity.get(entry.city);
          const compositeRunway = savingsRunwayByCity.get(entry.city);
          const readiness = calculateCityRelocationReadiness(
            scenarioIncomeDisplay,
            savingsBalance,
            affordability.displayReferenceCost,
            entry.city
          );
          const maxCost = Math.max(
            affordability.scenarioIncomeDisplay,
            affordability.displayReferenceCost,
            1
          );

          return (
            <article
              key={entry.city}
              className={`city-compare-card verdict-${affordability.verdict} ${
                index === 0 ? "top-pick" : ""
              }`}
            >
              {index === 0 && <div className="city-compare-badge">Best fit</div>}
              <div className="city-compare-header">
                <h4 className="city-name-with-flag">
                  <CityFlag city={entry.city} size={18} />
                  {cityName}
                </h4>
                <span className={`city-score-pill verdict-${affordability.verdict}`}>
                  {relocationFitScore}/100
                </span>
              </div>
              <p className="composite-score-type">Relocation fit score</p>
              {typeof financialHealthScore === "number" && (
                <p className="city-compare-health-score">
                  Financial health score: <strong>{financialHealthScore}/100</strong>
                </p>
              )}
              <p className="city-compare-verdict">{affordability.verdictLabel}</p>

              <div className="city-compare-bars">
                <div className="city-bar-row">
                  <span>Scenario income ({displayCurrency})</span>
                  <div className="city-bar-track">
                    <div
                      className="city-bar income"
                      style={{
                        width: `${(affordability.scenarioIncomeDisplay / maxCost) * 100}%`,
                      }}
                    />
                  </div>
                  <strong>{formatAmount(affordability.scenarioIncomeDisplay)}</strong>
                </div>
                <div className="city-bar-row">
                  <span>Est. cost ({displayCurrency})</span>
                  <div className="city-bar-track">
                    <div
                      className="city-bar cost"
                      style={{
                        width: `${(affordability.displayReferenceCost / maxCost) * 100}%`,
                      }}
                    />
                  </div>
                  <strong>{formatAmount(affordability.displayReferenceCost)}</strong>
                </div>
              </div>

              <div className="city-compare-balance">
                <span>Projected balance ({displayCurrency})</span>
                <strong
                  className={
                    affordability.projectedBalance >= 0 ? "positive" : "negative"
                  }
                >
                  {affordability.projectedBalance >= 0 ? "+" : ""}
                  {formatAmount(affordability.projectedBalance)}
                </strong>
              </div>

              <div className="city-compare-readiness">
                <div className="city-readiness-metric">
                  <span>Savings runway</span>
                  <strong>
                    {readiness.runwayMonths !== null
                      ? `${readiness.runwayMonths.toFixed(1)} mo`
                      : compositeRunway !== null && compositeRunway !== undefined
                        ? `${compositeRunway.toFixed(1)} mo`
                        : "—"}
                  </strong>
                </div>
                <div className="city-readiness-metric">
                  <span>Move readiness</span>
                  <strong>
                    {scenarioIncomeDisplay > 0 && affordability.displayReferenceCost > 0
                      ? `${readiness.moveReadinessPct.toFixed(0)}%`
                      : "—"}
                  </strong>
                </div>
                <div className="city-readiness-metric">
                  <span>Income coverage</span>
                  <strong>
                    {scenarioIncomeDisplay > 0 && affordability.displayReferenceCost > 0
                      ? `${Math.max(0, 100 - readiness.incomeCoveragePct).toFixed(0)}% free`
                      : "—"}
                  </strong>
                </div>
                <div className="city-readiness-metric">
                  <span>Savings entered</span>
                  <strong>
                    {savingsBalance && savingsBalance > 0
                      ? formatAmount(savingsBalance)
                      : "—"}
                  </strong>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
