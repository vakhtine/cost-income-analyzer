import { CityAffordabilitySummary } from "@/lib/relocation-scenario";
import { CityFlag } from "@/components/CityFlag";

type Props = {
  summaries: CityAffordabilitySummary[];
  formatAmount: (amount: number) => string;
  displayCurrency: string;
};

export function CityCompareGrid({ summaries, formatAmount, displayCurrency }: Props) {
  if (!summaries.length) return null;

  const sorted = [...summaries].sort((a, b) => {
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
          Ranked by projected monthly balance in {displayCurrency} — includes what-if income
          and lifestyle adjustments.
        </p>
      </div>
      <div className="city-compare-cards">
        {sorted.map((entry, index) => {
          const cityName = entry.city.split(",")[0];
          const { affordability } = entry;
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
                  {affordability.score}/100
                </span>
              </div>
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
            </article>
          );
        })}
      </div>
    </section>
  );
}
