import { LIFESTYLE_OPTIONS } from "@/lib/wizard";
import { RelocationAffordability } from "@/lib/relocation-affordability";

type Props = {
  affordability: RelocationAffordability;
  referenceCity: string;
  periodLabel: string;
  formatBalance: (amount: number) => string;
  financialHealthScore?: number;
};

export function RelocationVerdict({
  affordability,
  referenceCity,
  periodLabel,
  formatBalance,
  financialHealthScore,
}: Props) {
  const degrees = (affordability.score / 100) * 360;
  const {
    displayCurrency,
    incomeCurrency,
    referenceCostCurrency,
    currentIncomeDisplay,
    scenarioIncomeDisplay,
    displayReferenceCost,
    incomeChangePct,
    lifestyle,
  } = affordability;

  const lifestyleLabel =
    LIFESTYLE_OPTIONS.find((option) => option.id === lifestyle)?.label ?? lifestyle;
  const hasIncomeScenario = incomeChangePct !== 0;
  const hasLifestyleScenario = lifestyle !== "average";

  return (
    <section className={`verdict-card verdict-${affordability.verdict}`}>
      <div className="verdict-header">
        <div>
          <h3>{affordability.verdictLabel}</h3>
          <p className="verdict-score-note">
            <strong>{affordability.score}/100</strong> — relocation fit for{" "}
            <strong>{referenceCity}</strong> based on scenario income minus estimated destination
            cost (all amounts in <strong>{displayCurrency}</strong>
            {hasIncomeScenario || hasLifestyleScenario ? ", including what-if adjustments" : ""}
            ).
            {typeof financialHealthScore === "number" && (
              <>
                {" "}
                Your financial health score is <strong>{financialHealthScore}/100</strong> — that
                measures spending habits, not city affordability.
              </>
            )}
          </p>
        </div>
        <div className="score-ring-wrap verdict-score-wrap">
          <div
            className="score-ring verdict-score-ring"
            style={{
              background: `conic-gradient(var(--verdict-color) ${degrees}deg, #e2e8f0 0deg)`,
            }}
          >
            <div className="score-ring-inner">
              <div className="score-ring-value">{affordability.score}</div>
              <div className="score-ring-max">/100</div>
            </div>
          </div>
          <div className="score-ring-label">Relocation affordability</div>
        </div>
      </div>

      <div className="verdict-tips">
        <div className="verdict-tips-label">What this means for {periodLabel}</div>
        <p className="verdict-summary">{affordability.summary}</p>
        {affordability.tips.map((tip) => (
          <div key={tip} className="verdict-tip">
            {tip}
          </div>
        ))}
      </div>

      <div className="verdict-metrics">
        <div className="verdict-metric">
          <span>
            Your current monthly income
            <em className="verdict-metric-currency">
              {incomeCurrency} → {displayCurrency}
            </em>
          </span>
          <strong>{formatBalance(currentIncomeDisplay)}</strong>
        </div>
        {hasIncomeScenario && (
          <div className="verdict-metric">
            <span>
              Scenario monthly income ({incomeChangePct >= 0 ? "+" : ""}
              {incomeChangePct}%)
              <em className="verdict-metric-currency">used for balance · {displayCurrency}</em>
            </span>
            <strong>{formatBalance(scenarioIncomeDisplay)}</strong>
          </div>
        )}
        <div className="verdict-metric">
          <span>
            Est. cost in {referenceCity}
            <em className="verdict-metric-currency">
              {referenceCostCurrency} → {displayCurrency}
              {hasLifestyleScenario ? ` · ${lifestyleLabel}` : ""}
            </em>
          </span>
          <strong>{formatBalance(displayReferenceCost)}</strong>
        </div>
        <div className="verdict-metric highlight">
          <span>
            Projected monthly balance
            <em className="verdict-metric-currency">{displayCurrency}</em>
          </span>
          <strong className={affordability.projectedBalance >= 0 ? "positive" : "negative"}>
            {affordability.projectedBalance >= 0 ? "+" : ""}
            {formatBalance(affordability.projectedBalance)}
          </strong>
        </div>
      </div>

      <p className="verdict-formula-note">
        Projected monthly balance ({displayCurrency}) = scenario monthly income (
        {hasIncomeScenario
          ? `${formatBalance(currentIncomeDisplay)} ${displayCurrency} from ${incomeCurrency} at ${incomeChangePct >= 0 ? "+" : ""}${incomeChangePct}%`
          : `${formatBalance(scenarioIncomeDisplay)} ${displayCurrency} from ${incomeCurrency}`}
        ) − estimated monthly cost in destination (
        {formatBalance(displayReferenceCost)} {displayCurrency} from {referenceCostCurrency}
        {hasLifestyleScenario ? `, ${lifestyleLabel} lifestyle` : ""}).
      </p>
    </section>
  );
}
