"use client";

import { useEffect, useState } from "react";
import { CityFlag } from "@/components/CityFlag";
import { CityRecommendation, recommendCitiesForSpending } from "@/lib/city-recommender";
import { AffordabilityCurrencyContext } from "@/lib/relocation-affordability";
import { useCurrency } from "@/lib/currency-context";
import { PeriodAnalysis, Transaction } from "@/lib/types";
import { RelocationScenario } from "@/lib/relocation-scenario";

type Props = {
  rows: Transaction[];
  periodAnalysis: PeriodAnalysis;
  periodLabel: string;
  householdSize: number;
  scenario: RelocationScenario;
  baseCity: string;
  excludeCities?: string[];
  focusCities?: string[];
  currencyContext: AffordabilityCurrencyContext;
  onRecommendations?: (results: CityRecommendation[]) => void;
};

export function CityRecommender({
  rows,
  periodAnalysis,
  periodLabel,
  householdSize,
  scenario,
  baseCity,
  excludeCities = [],
  focusCities = [],
  currencyContext,
  onRecommendations,
}: Props) {
  const { formatDisplay, settings } = useCurrency();
  const [recommendations, setRecommendations] = useState<CityRecommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (!onRecommendations) return;
    onRecommendations(recommendations);
  }, [recommendations, onRecommendations]);

  async function runRecommendations() {
    setLoading(true);
    setError("");
    try {
      const rankedCities = focusCities.filter((city) => city && city !== baseCity);
      const results = await recommendCitiesForSpending(
        rows,
        periodAnalysis,
        periodLabel,
        householdSize,
        scenario,
        excludeCities,
        rankedCities.length ? rankedCities.length : 3,
        rankedCities.length ? rankedCities : undefined,
        currencyContext
      );
      setRecommendations(results);
      setStatus(
        rankedCities.length
          ? `Your ${results.length} selected destinations ranked by projected monthly balance.`
          : `Top ${results.length} cities ranked for your spending profile.`
      );
    } catch (recommendError) {
      setError(
        recommendError instanceof Error
          ? recommendError.message
          : "Could not load city recommendations."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="card city-recommender">
      <div className="section-heading">
        <h3>Best cities for your spending</h3>
        <p>
          {focusCities.filter(Boolean).length
            ? "Ranks your selected destination cities by projected monthly balance for your income and lifestyle scenario."
            : "Scans all supported cities and shows the top 3 ranked by projected monthly balance for your income and lifestyle scenario."}
        </p>
      </div>

      <button className="tab active" onClick={runRecommendations} disabled={loading}>
        {loading ? "Scanning cities..." : "Find best-fit cities"}
      </button>

      {status && <div className="save-notice inline visible">{status}</div>}

      {error && <div className="error">{error}</div>}

      {recommendations.length > 0 && (
        <div className="recommendation-list">
          {recommendations.map((entry, index) => {
            const cityName = entry.city.split(",")[0];
            return (
              <article
                key={entry.city}
                className={`recommendation-card ${index === 0 ? "top-pick" : ""}`}
              >
                <div className="recommendation-card-top">
                  <div className="recommendation-rank">#{index + 1}</div>
                  <div>
                    <h4 className="city-name-with-flag">
                      <CityFlag city={entry.city} size={18} />
                      {cityName}
                    </h4>
                    <p className="recommendation-meta">{entry.city}</p>
                    <p className="recommendation-verdict">{entry.verdictLabel}</p>
                  </div>
                  <div className="recommendation-stats">
                    <div>
                      <span>Balance</span>
                      <strong className={entry.projectedBalance >= 0 ? "positive" : "negative"}>
                        {formatDisplay(entry.projectedBalance)}
                      </strong>
                    </div>
                    <div>
                      <span>Est. cost ({settings.displayCurrency})</span>
                      <strong>{formatDisplay(entry.referenceMonthlyCost)}</strong>
                    </div>
                    <div>
                      <span>Score</span>
                      <strong>{entry.score}/100</strong>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
