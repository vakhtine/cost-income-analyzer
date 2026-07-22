"use client";

import { useCallback, useMemo, useState } from "react";
import { CategoryBenchmarkMatrix } from "@/components/CategoryBenchmarkMatrix";
import { CityCompareGrid } from "@/components/CityCompareGrid";
import { CityRecommender } from "@/components/CityRecommender";
import { CustomReportExport } from "@/components/CustomReportExport";
import { CurrencySettingsPanel } from "@/components/CurrencySettingsPanel";
import { RelocationProfilePanel } from "@/components/RelocationProfilePanel";
import { RelocationReportExport } from "@/components/RelocationReportExport";
import { PurchasingPowerCalculator } from "@/components/PurchasingPowerCalculator";
import { MultiCityCostComparison } from "@/components/MultiCityCostComparison";
import { RelocationVerdict } from "@/components/RelocationVerdict";
import {
  compareMultipleCities,
  getUserBenchmarkSpending,
  MONTHLY_BENCHMARK_NOTE,
  rebuildLocationResult,
  referenceSavingsPct,
} from "@/lib/city-data";
import { ALL_REFERENCE_CITIES, REFERENCE_CITY_GROUPS } from "@/lib/constants";
import { CityRecommendation, recommendCitiesForSpending } from "@/lib/city-recommender";
import { useCurrency } from "@/lib/currency-context";
import {
  AVERAGE_PERIOD_LABEL,
  analyzeAveragePeriods,
  buildAveragePeriodRows,
} from "@/lib/rebuild";
import { loadRelocationProfile, calculateRelocationReadiness } from "@/lib/relocation-profile";
import {
  applyScenarioToLocationResult,
  buildCitySummaries,
  computeScenarioAffordability,
} from "@/lib/relocation-scenario";
import { AffordabilityCurrencyContext } from "@/lib/relocation-affordability";
import { AnalyzeResponse, LocationCompareResult } from "@/lib/types";
import { LIFESTYLE_OPTIONS, LifestyleLevel } from "@/lib/wizard";

function CitySelect({
  value,
  onChange,
  exclude = [],
  allowEmpty = false,
}: {
  value: string;
  onChange: (city: string) => void;
  exclude?: string[];
  allowEmpty?: boolean;
}) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value)}>
      {allowEmpty && <option value="">None</option>}
      {REFERENCE_CITY_GROUPS.map((group) => (
        <optgroup key={group.label} label={group.label}>
          {group.cities
            .filter((city) => !exclude.includes(city))
            .map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
        </optgroup>
      ))}
    </select>
  );
}

type Props = {
  data: AnalyzeResponse;
  baseCity: string;
  onBaseCityChange: (city: string) => void;
  locationPeriod: string;
  onLocationPeriodChange: (period: string) => void;
  onError: (message: string) => void;
};

export function RelocationExplorer({
  data,
  baseCity,
  onBaseCityChange,
  locationPeriod,
  onLocationPeriodChange,
  onError,
}: Props) {
  const [primaryCity, setPrimaryCity] = useState<string>(ALL_REFERENCE_CITIES[0]);
  const [compareCity2, setCompareCity2] = useState<string>(ALL_REFERENCE_CITIES[1]);
  const [compareCity3, setCompareCity3] = useState<string>(ALL_REFERENCE_CITIES[2] ?? "");
  const [householdSize, setHouseholdSize] = useState(1);
  const [incomeChangePct, setIncomeChangePct] = useState(0);
  const [lifestyle, setLifestyle] = useState<LifestyleLevel>("average");
  const [cityResults, setCityResults] = useState<LocationCompareResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [compareNotice, setCompareNotice] = useState("");
  const [topRecommendations, setTopRecommendations] = useState<CityRecommendation[]>([]);
  const { formatIncome, formatExpense, formatUsd, formatDisplay, convertIncome, settings, rates } =
    useCurrency();

  const isAveragePeriod = locationPeriod === AVERAGE_PERIOD_LABEL;
  const periodRows = isAveragePeriod
    ? buildAveragePeriodRows(data.period_rows)
    : data.period_rows[locationPeriod] ?? [];
  const periodAnalysis = isAveragePeriod
    ? analyzeAveragePeriods(data.period_rows)
    : data.period_analysis[locationPeriod];
  const periodDisplayLabel = isAveragePeriod ? "Average (all periods)" : locationPeriod;
  const selectedCities = [primaryCity, compareCity2, compareCity3].filter(Boolean);
  const userSpending = useMemo(() => getUserBenchmarkSpending(periodRows), [periodRows]);

  const primaryResult = useMemo(
    () => cityResults.find((result) => result.reference_city === primaryCity) ?? null,
    [cityResults, primaryCity]
  );

  const scenario = useMemo(
    () => ({ incomeChangePct, lifestyle }),
    [incomeChangePct, lifestyle]
  );

  const currencyContext = useMemo((): AffordabilityCurrencyContext => {
    const activeRates = rates ?? {
      base: "EUR" as const,
      date: "fallback",
      rates: {
        USD: 1.08,
        GBP: 0.85,
        ALL: 103,
        RSD: 117,
        BAM: 1.96,
        MKD: 61.5,
        CHF: 0.96,
        CAD: 1.47,
        AUD: 1.65,
        BGN: 1.96,
        RON: 4.97,
        TRY: 35,
      },
    };
    return {
      incomeCurrency: settings.incomeCurrency,
      expenseCurrency: settings.expenseCurrency,
      displayCurrency: settings.displayCurrency,
      rates: activeRates,
    };
  }, [settings, rates]);

  const primaryAffordability = useMemo(() => {
    if (!primaryResult || !periodAnalysis) return null;
    return computeScenarioAffordability(
      periodAnalysis,
      primaryResult,
      scenario,
      currencyContext
    );
  }, [primaryResult, periodAnalysis, scenario, currencyContext]);
  const adjustedPrimaryResult = useMemo(() => {
    if (!primaryResult) return null;
    return applyScenarioToLocationResult(primaryResult, lifestyle);
  }, [primaryResult, lifestyle]);

  const citySummaries = useMemo(() => {
    if (!periodAnalysis || !cityResults.length) return [];
    return buildCitySummaries(periodAnalysis, cityResults, scenario, currencyContext);
  }, [periodAnalysis, cityResults, scenario, currencyContext]);

  const buildReportPayload = useCallback(async () => {
    const profile = loadRelocationProfile();
    const readiness = periodAnalysis
      ? calculateRelocationReadiness(periodAnalysis, profile.savingsBalance)
      : {
          runwayMonths: null,
          runwayLabel: "",
          moveReadinessPct: 0,
          moveReadinessLabel: "",
          incomeCoveragePct: 0,
          incomeCoverageLabel: "",
        };
    const lifestyleOption = LIFESTYLE_OPTIONS.find((item) => item.id === lifestyle);

    let recommendations = topRecommendations;
    if (!recommendations.length && periodAnalysis) {
      const rankedCities = selectedCities.filter((city) => city && city !== baseCity);
      recommendations = await recommendCitiesForSpending(
        periodRows,
        periodAnalysis,
        locationPeriod,
        householdSize,
        scenario,
        [baseCity],
        rankedCities.length ? rankedCities.length : 3,
        rankedCities.length ? rankedCities : undefined,
        currencyContext
      );
    }

    const bestFitCity = recommendations[0]?.city ?? primaryCity;
    const bestFitSummary = citySummaries.find((entry) => entry.city === bestFitCity);
    const bestFitResult =
      cityResults.find((result) => result.reference_city === bestFitCity) ?? primaryResult;
    const reportAffordability =
      bestFitSummary?.affordability ??
      (bestFitResult && periodAnalysis
        ? computeScenarioAffordability(
            periodAnalysis,
            bestFitResult,
            scenario,
            currencyContext
          )
        : primaryAffordability);
    const reportPrimaryResult = bestFitResult
      ? applyScenarioToLocationResult(bestFitResult, lifestyle)
      : adjustedPrimaryResult;

    return {
      generatedAt: new Date().toLocaleString(),
      periodLabel: locationPeriod,
      baseCity,
      primaryCity,
      bestFitCity,
      displayCurrency: settings.displayCurrency,
      householdSize,
      incomeChangePct,
      lifestyleLabel: lifestyleOption?.label ?? lifestyle,
      lifestyleDescription: lifestyleOption?.description ?? "",
      timeline: profile.timeline,
      data,
      affordability: reportAffordability,
      readiness,
      savingsBalance: profile.savingsBalance,
      citySummaries,
      recommendations: recommendations.map((entry) => ({
        city: entry.city,
        projectedBalance: entry.projectedBalance,
        verdictLabel: entry.verdictLabel,
      })),
      topRecommendations: recommendations.slice(0, 3).map((entry) => ({
        city: entry.city,
        score: entry.score,
        projectedBalance: entry.projectedBalance,
        referenceMonthlyCost: entry.referenceMonthlyCost,
        verdictLabel: entry.verdictLabel,
      })),
      primaryResult: reportPrimaryResult,
      formatDisplay,
      formatExpense,
      formatReferenceCost: formatUsd,
    };
  }, [
    locationPeriod,
    baseCity,
    primaryCity,
    householdSize,
    incomeChangePct,
    lifestyle,
    data,
    primaryAffordability,
    periodAnalysis,
    citySummaries,
    adjustedPrimaryResult,
    topRecommendations,
    periodRows,
    scenario,
    selectedCities,
    currencyContext,
    formatDisplay,
    formatExpense,
    formatUsd,
    settings.displayCurrency,
  ]);

  function updateCityResults(next: LocationCompareResult[]) {
    setCityResults(next);
  }

  function handleBenchmarkChange(city: string, categoryKey: string, value: number) {
    updateCityResults(
      cityResults.map((result) => {
        if (result.reference_city !== city) return result;
        const nextBenchmarks = {
          ...result.reference_benchmarks,
          [categoryKey]: Number.isFinite(value) ? value : 0,
        };
        return rebuildLocationResult(result, periodRows, nextBenchmarks, householdSize);
      })
    );
  }

  function handleResetCity(city: string) {
    updateCityResults(
      cityResults.map((result) => {
        if (result.reference_city !== city) return result;
        return rebuildLocationResult(
          result,
          periodRows,
          { ...result.original_benchmarks },
          householdSize
        );
      })
    );
  }

  async function runComparison() {
    if (!locationPeriod) return;
    setLoading(true);
    onError("");
    try {
      if (!periodRows.length) {
        throw new Error(`No transactions found for ${locationPeriod}.`);
      }
      const results = await compareMultipleCities(
        periodRows,
        selectedCities,
        householdSize,
        locationPeriod
      );
      setCityResults(results.map((result) => ({ ...result, base_city: baseCity })));
      setCompareNotice(
        `Compared ${results.length} cities for ${locationPeriod} — scroll down for side-by-side results.`
      );
    } catch (compareError) {
      onError(
        compareError instanceof Error ? compareError.message : "Could not compare locations."
      );
    } finally {
      setLoading(false);
    }
  }

  const buildCustomReportPayload = useCallback(async () => {
    if (!periodAnalysis) {
      throw new Error("Select a valid analysis period first.");
    }

    const recommendations =
      citySummaries.length > 0
        ? citySummaries
            .map((entry) => ({
              city: entry.city,
              score: entry.affordability.score,
              projectedBalance: entry.affordability.projectedBalance,
              referenceMonthlyCost: entry.affordability.displayReferenceCost,
              verdictLabel: entry.affordability.verdictLabel,
            }))
            .sort((a, b) => b.projectedBalance - a.projectedBalance)
            .slice(0, 5)
        : await recommendCitiesForSpending(
            periodRows,
            periodAnalysis,
            locationPeriod,
            householdSize,
            scenario,
            [baseCity],
            selectedCities.filter((city) => city && city !== baseCity).length || 5,
            selectedCities.filter((city) => city && city !== baseCity).length
              ? selectedCities.filter((city) => city && city !== baseCity)
              : undefined,
            currencyContext
          );

    return {
      generatedAt: new Date().toLocaleString(),
      periodLabel: locationPeriod,
      baseCity,
      displayCurrency: settings.displayCurrency,
      data,
      periodAnalysis,
      recommendations,
      formatIncome,
      formatExpense,
    };
  }, [
    periodAnalysis,
    citySummaries,
    periodRows,
    locationPeriod,
    householdSize,
    scenario,
    baseCity,
    settings.displayCurrency,
    data,
    formatIncome,
    formatExpense,
    selectedCities,
    currencyContext,
  ]);

  return (
    <div className="stack">
      <CurrencySettingsPanel />

      <PurchasingPowerCalculator
        defaultSourceCity={baseCity}
        defaultDestCity={primaryCity}
        householdSize={householdSize}
      />

      {periodAnalysis && (
        <RelocationProfilePanel
          analysis={periodAnalysis}
          defaultCity={primaryCity}
          householdSize={householdSize}
        />
      )}

      <section className="card">
        <h3>Can I afford to move?</h3>
        <p>
          Compare your monthly spending against Balkan, European, and North American reference
          cities. Adjust category costs to match quotes you have received.
        </p>

        <div className="form-grid">
          <label>
            Period to compare
            <select
              value={locationPeriod}
              onChange={(event) => onLocationPeriodChange(event.target.value)}
            >
              {data.periods.map((period) => (
                <option key={period} value={period}>
                  {period}
                </option>
              ))}
              {data.periods.length > 1 && (
                <option value={AVERAGE_PERIOD_LABEL}>Average (all periods)</option>
              )}
            </select>
          </label>
          <label>
            Your current location
            <CitySelect
              value={baseCity}
              onChange={onBaseCityChange}
              exclude={selectedCities}
            />
          </label>
          <label>
            Household size
            <select
              value={householdSize}
              onChange={(event) => setHouseholdSize(Number(event.target.value))}
            >
              {[1, 2, 3, 4, 5].map((size) => (
                <option key={size} value={size}>
                  {size} {size === 1 ? "person" : "people"}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="scenario-panel">
          <h4>What-if scenario</h4>
          <div className="slider-block">
            <div className="slider-header">
              <span>Expected income change after moving</span>
              <strong className={incomeChangePct >= 0 ? "positive" : "negative"}>
                {incomeChangePct >= 0 ? "+" : ""}
                {incomeChangePct}%
              </strong>
            </div>
            <input
              type="range"
              min={-20}
              max={50}
              step={5}
              value={incomeChangePct}
              onChange={(event) => setIncomeChangePct(Number(event.target.value))}
              className="range-input"
            />
            <div className="slider-ticks">
              <span>-20%</span>
              <span>Same income</span>
              <span>+50%</span>
            </div>
            {periodAnalysis && (
              <p className="slider-note">
                Scenario monthly income:{" "}
                <strong>
                  {formatDisplay(
                    convertIncome(periodAnalysis.total_income) *
                      (1 + incomeChangePct / 100)
                  )}
                </strong>{" "}
                ({settings.incomeCurrency} → {settings.displayCurrency}
                {incomeChangePct !== 0
                  ? `, ${incomeChangePct >= 0 ? "+" : ""}${incomeChangePct}%`
                  : ""}
                )
              </p>
            )}
          </div>

          <div className="lifestyle-toggle">
            {LIFESTYLE_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                className={`lifestyle-option ${lifestyle === option.id ? "active" : ""}`}
                onClick={() => setLifestyle(option.id)}
              >
                <strong>{option.label}</strong>
                <span>{option.description}</span>
              </button>
            ))}
          </div>
          <p className="lifestyle-assumption-note">
            Assumption: your income stays the same — only estimated living costs in the destination
            change with lifestyle (Budget, Average, or Comfortable).
          </p>
        </div>

        <div className="city-pickers">
          <label>
            Compare city 1
            <CitySelect
              value={primaryCity}
              onChange={setPrimaryCity}
              exclude={[baseCity, compareCity2, compareCity3].filter(Boolean)}
            />
          </label>
          <label>
            Compare city 2
            <CitySelect
              value={compareCity2}
              onChange={setCompareCity2}
              exclude={[baseCity, primaryCity, compareCity3].filter(Boolean)}
            />
          </label>
          <label>
            Compare city 3 (optional)
            <CitySelect
              value={compareCity3}
              onChange={setCompareCity3}
              allowEmpty
              exclude={[baseCity, primaryCity, compareCity2].filter(Boolean)}
            />
          </label>
        </div>

        <p className="insight location-callout">
          Exploring a move from <strong>{baseCity}</strong> during{" "}
          <strong>{periodDisplayLabel}</strong> with a{" "}
          <strong>{LIFESTYLE_OPTIONS.find((item) => item.id === lifestyle)?.label}</strong>{" "}
          lifestyle.
        </p>

        <button className="tab active" onClick={runComparison} disabled={loading}>
          {loading ? "Loading city data..." : "Compare selected cities"}
        </button>
        {compareNotice && <div className="save-notice inline visible">{compareNotice}</div>}
      </section>

      {citySummaries.length > 0 && (
        <CityCompareGrid
          summaries={citySummaries}
          formatAmount={formatDisplay}
          displayCurrency={settings.displayCurrency}
        />
      )}

      {selectedCities.length > 0 && (
        <MultiCityCostComparison
          baseCity={baseCity}
          cities={selectedCities}
          formatUsd={formatUsd}
        />
      )}

      {cityResults.length > 0 && (
        <CategoryBenchmarkMatrix
          cities={cityResults}
          userSpending={userSpending}
          onBenchmarkChange={handleBenchmarkChange}
          onResetCity={handleResetCity}
        />
      )}

      {primaryAffordability && primaryResult && (
        <RelocationVerdict
          affordability={primaryAffordability}
          referenceCity={primaryResult.reference_city}
          periodLabel={primaryResult.period_label}
          formatBalance={formatDisplay}
          financialHealthScore={data.health_score.overall}
        />
      )}

      {periodAnalysis && (
        <CityRecommender
          rows={periodRows}
          periodAnalysis={periodAnalysis}
          periodLabel={locationPeriod}
          householdSize={householdSize}
          scenario={scenario}
          baseCity={baseCity}
          excludeCities={[baseCity]}
          focusCities={selectedCities}
          currencyContext={currencyContext}
          onRecommendations={setTopRecommendations}
        />
      )}

      <RelocationReportExport
        buildPayload={buildReportPayload}
        disabled={!periodAnalysis}
      />

      <CustomReportExport
        buildPayload={buildCustomReportPayload}
        disabled={!periodAnalysis}
      />

      {adjustedPrimaryResult && (
        <section className="card">
          <div className="location-meta">
            <div>
              <span>Your location</span>
              <strong>{adjustedPrimaryResult.base_city ?? baseCity}</strong>
            </div>
            <div>
              <span>Compare city 1</span>
              <strong>{adjustedPrimaryResult.reference_city}</strong>
            </div>
            <div>
              <span>Month compared</span>
              <strong>{adjustedPrimaryResult.period_label}</strong>
            </div>
            <div>
              <span>Scenario</span>
              <strong>
                {incomeChangePct >= 0 ? "+" : ""}
                {incomeChangePct}% income · {lifestyle}
              </strong>
            </div>
          </div>

          <p className="insight methodology-note" style={{ marginTop: 16 }}>
            <strong>How reference costs are calculated:</strong> {MONTHLY_BENCHMARK_NOTE}
            <br />
            <strong>Source:</strong> {adjustedPrimaryResult.metadata.source}
            <br />
            <strong>Updated:</strong> {adjustedPrimaryResult.metadata.updated}
          </p>

          {adjustedPrimaryResult.comparisons.length > 0 && (
            <table>
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Your spending</th>
                  <th>Reference average</th>
                  <th>Difference</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {adjustedPrimaryResult.comparisons.map((row) => {
                  const savingsPct = referenceSavingsPct(row.user_amount, row.reference_amount);
                  return (
                  <tr key={row.category}>
                    <td>{row.category}</td>
                    <td>{formatExpense(row.user_amount)}</td>
                    <td>{formatExpense(row.reference_amount)}</td>
                    <td>
                      {row.difference >= 0 ? "+" : ""}
                      {formatExpense(row.difference)} ({savingsPct >= 0 ? "+" : ""}
                      {savingsPct.toFixed(1)}% vs ref.)
                    </td>
                    <td>
                      <span
                        className={`status-pill ${
                          row.status.includes("Above")
                            ? "status-high"
                            : row.status.includes("Below")
                              ? "status-low"
                              : "status-mid"
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>
      )}
    </div>
  );
}
