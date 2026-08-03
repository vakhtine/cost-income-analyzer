"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CompositeScoresPanel } from "@/components/CompositeScoresPanel";
import { PurchasingPowerIndexPanel } from "@/components/PurchasingPowerIndexPanel";
import { CategoryBenchmarkMatrix } from "@/components/CategoryBenchmarkMatrix";
import { CityCompareGrid } from "@/components/CityCompareGrid";
import { CustomReportExport } from "@/components/CustomReportExport";
import { CurrencySettingsPanel } from "@/components/CurrencySettingsPanel";
import { RelocationReportExport } from "@/components/RelocationReportExport";
import { PurchasingPowerCalculator } from "@/components/PurchasingPowerCalculator";
import { MultiCityCostComparison } from "@/components/MultiCityCostComparison";
import {
  compareMultipleCities,
  fetchCityMonthlyCost,
  fetchCityRentEstimate,
  getUserBenchmarkSpending,
  hasCustomBenchmarks,
  MONTHLY_BENCHMARK_NOTE,
  rebuildLocationResult,
} from "@/lib/city-data";
import { ALL_REFERENCE_CITIES, REFERENCE_CITY_GROUPS } from "@/lib/constants";
import { recommendCitiesForSpending } from "@/lib/city-recommender";
import { useCurrency } from "@/lib/currency-context";
import {
  AVERAGE_PERIOD_LABEL,
  analyzeAveragePeriods,
  buildAveragePeriodRows,
  healthScoreForPeriodSelection,
  resolvePeriodReportSelection,
} from "@/lib/rebuild";
import {
  buildCompositeScoreEntries,
  buildPurchasingPowerIndexEntries,
  CompositeScoreEntry,
  PurchasingPowerIndexEntry,
} from "@/lib/relocation-composite";
import { convertAmount } from "@/lib/currency";
import { adjustHealthScoreForScenarioIncome } from "@/lib/health-score";
import { loadRelocationProfile, calculateCityRelocationReadiness, RELOCATION_TIMELINE_OPTIONS, RelocationProfile, RelocationTimeline, saveRelocationProfile } from "@/lib/relocation-profile";
import {
  applyScenarioToLocationResult,
  buildCitySummaries,
  computeScenarioAffordability,
} from "@/lib/relocation-scenario";
import { AffordabilityCurrencyContext } from "@/lib/relocation-affordability";
import { combinePeriodRowsInRange } from "@/lib/spending-metrics";
import { AnalyzeResponse, LocationCompareResult } from "@/lib/types";
import { LIFESTYLE_OPTIONS, LifestyleLevel, lifestyleMultiplier } from "@/lib/wizard";

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
  const [relocationProfile, setRelocationProfile] = useState<RelocationProfile>(() =>
    loadRelocationProfile()
  );
  const [profileSavedNotice, setProfileSavedNotice] = useState("");
  const [spendingPeriod, setSpendingPeriod] = useState(locationPeriod);
  const [homeMonthlyCostDisplay, setHomeMonthlyCostDisplay] = useState<number | null>(null);
  const { formatIncome, formatExpense, formatUsd, formatDisplay, convertIncome, convertExpense, settings, rates } =
    useCurrency();

  useEffect(() => {
    saveRelocationProfile(relocationProfile);
  }, [relocationProfile]);

  const spendingRows = data.period_rows[spendingPeriod] ?? [];
  const spendingUserSpending = useMemo(
    () => getUserBenchmarkSpending(spendingRows),
    [spendingRows]
  );
  const [estimatedRent, setEstimatedRent] = useState<number | null>(null);
  const rentIsEstimated = (spendingUserSpending.rent ?? 0) === 0 && estimatedRent !== null;

  useEffect(() => {
    if ((spendingUserSpending.rent ?? 0) > 0) {
      setEstimatedRent(null);
      return;
    }
    let cancelled = false;
    fetchCityRentEstimate(baseCity, householdSize, lifestyleMultiplier(lifestyle))
      .then((rent) => {
        if (!cancelled) setEstimatedRent(rent);
      })
      .catch(() => {
        if (!cancelled) setEstimatedRent(null);
      });
    return () => {
      cancelled = true;
    };
  }, [baseCity, householdSize, lifestyle, spendingUserSpending.rent]);

  const displayUserSpending = useMemo(() => {
    if (rentIsEstimated && estimatedRent !== null) {
      return { ...spendingUserSpending, rent: estimatedRent };
    }
    return spendingUserSpending;
  }, [spendingUserSpending, rentIsEstimated, estimatedRent]);

  const isAveragePeriod = locationPeriod === AVERAGE_PERIOD_LABEL;
  const periodRows = isAveragePeriod
    ? buildAveragePeriodRows(data.period_rows)
    : data.period_rows[locationPeriod] ?? [];
  const periodAnalysis = isAveragePeriod
    ? analyzeAveragePeriods(data.period_rows)
    : data.period_analysis[locationPeriod];
  const periodDisplayLabel = isAveragePeriod ? "Average (all periods)" : locationPeriod;
  const selectedCities = [primaryCity, compareCity2, compareCity3].filter(Boolean);

  useEffect(() => {
    setCityResults([]);
    setCompareNotice("");
  }, [data.period_rows, locationPeriod, baseCity]);

  const scenarioIncomeNote = useMemo(() => {
    const adjustment =
      incomeChangePct !== 0
        ? `${incomeChangePct >= 0 ? "+" : ""}${incomeChangePct}% ${settings.displayCurrency}`
        : settings.displayCurrency;
    return `${settings.incomeCurrency} → ${adjustment}`;
  }, [incomeChangePct, settings.displayCurrency, settings.incomeCurrency]);

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

  const customBenchmarksActive = useMemo(
    () => hasCustomBenchmarks(cityResults),
    [cityResults]
  );

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const usdCost = await fetchCityMonthlyCost(baseCity, householdSize);
        const lifestyleCost = usdCost * lifestyleMultiplier(lifestyle);
        const displayCost = convertAmount(
          lifestyleCost,
          "USD",
          settings.displayCurrency,
          currencyContext.rates
        );
        if (!cancelled) setHomeMonthlyCostDisplay(displayCost);
      } catch {
        if (!cancelled && periodAnalysis) {
          setHomeMonthlyCostDisplay(convertIncome(periodAnalysis.total_expenses));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    baseCity,
    householdSize,
    lifestyle,
    periodAnalysis,
    settings.displayCurrency,
    currencyContext.rates,
    convertIncome,
  ]);

  const scenarioIncomeDisplay = useMemo(() => {
    if (!periodAnalysis) return 0;
    return convertIncome(periodAnalysis.total_income) * (1 + incomeChangePct / 100);
  }, [periodAnalysis, convertIncome, incomeChangePct]);

  const baseHealthScore = useMemo(() => {
    if (!periodAnalysis) return data.health_score;
    return healthScoreForPeriodSelection(
      data.period_rows,
      locationPeriod,
      data.periods
    );
  }, [data.health_score, data.period_rows, data.periods, locationPeriod, periodAnalysis]);

  const scenarioHealthScore = useMemo(() => {
    if (!periodAnalysis) return baseHealthScore.overall;
    const baseIncome = baseHealthScore.metrics?.total_income ?? periodAnalysis.total_income;
    const baseExpenses = baseHealthScore.metrics?.total_expenses ?? periodAnalysis.total_expenses;
    const incomeFactor = 1 + incomeChangePct / 100;
    return adjustHealthScoreForScenarioIncome(
      baseHealthScore,
      baseIncome * incomeFactor,
      baseExpenses,
      periodRows,
      { focusPeriod: periodDisplayLabel }
    ).overall;
  }, [
    baseHealthScore,
    periodAnalysis,
    periodRows,
    incomeChangePct,
    periodDisplayLabel,
  ]);

  const purchasingPowerEntries = useMemo((): PurchasingPowerIndexEntry[] => {
    if (!homeMonthlyCostDisplay || !citySummaries.length) return [];
    return buildPurchasingPowerIndexEntries(
      baseCity,
      homeMonthlyCostDisplay,
      citySummaries.map((summary) => ({
        city: summary.city,
        monthlyCost: summary.affordability.displayReferenceCost,
      }))
    );
  }, [baseCity, citySummaries, homeMonthlyCostDisplay]);

  const compositeEntries = useMemo((): CompositeScoreEntry[] => {
    if (!homeMonthlyCostDisplay || !citySummaries.length) return [];
    return buildCompositeScoreEntries({
      homeCity: baseCity,
      homeMonthlyCost: homeMonthlyCostDisplay,
      baseHealthScore,
      expenseRows: periodRows,
      incomeChangePct,
      toDisplayExpense: convertExpense,
      savingsBalance: relocationProfile.savingsBalance,
      citySummaries,
    });
  }, [
    baseCity,
    citySummaries,
    baseHealthScore,
    periodRows,
    incomeChangePct,
    convertExpense,
    homeMonthlyCostDisplay,
    relocationProfile.savingsBalance,
  ]);

  const bestFitFromComparison = useMemo(() => {
    if (!citySummaries.length) return null;
    return [...citySummaries].sort((a, b) => {
      const balanceDiff =
        b.affordability.projectedBalance - a.affordability.projectedBalance;
      if (balanceDiff !== 0) return balanceDiff;
      return (
        a.affordability.displayReferenceCost - b.affordability.displayReferenceCost
      );
    })[0];
  }, [citySummaries]);

  const buildReportPayload = useCallback(async (exportPeriod: string) => {
    const isExportAverage = exportPeriod === AVERAGE_PERIOD_LABEL;
    const exportPeriodAnalysis = isExportAverage
      ? analyzeAveragePeriods(data.period_rows)
      : data.period_analysis[exportPeriod] ?? periodAnalysis;
    const exportPeriodRows = isExportAverage
      ? buildAveragePeriodRows(data.period_rows)
      : data.period_rows[exportPeriod] ?? periodRows;
    const exportPeriodLabel = isExportAverage ? "Average (all periods)" : exportPeriod;

    const lifestyleOption = LIFESTYLE_OPTIONS.find((item) => item.id === lifestyle);
    const rankedCities = selectedCities.filter((city) => city && city !== baseCity);

    let userBenchmarkSpending = getUserBenchmarkSpending(exportPeriodRows);
    if ((userBenchmarkSpending.rent ?? 0) === 0) {
      try {
        const rent = await fetchCityRentEstimate(
          baseCity,
          householdSize,
          lifestyleMultiplier(lifestyle)
        );
        userBenchmarkSpending = { ...userBenchmarkSpending, rent };
      } catch {
        // Keep rent at 0 when public estimate is unavailable.
      }
    }

    let recommendations = exportPeriodAnalysis
      ? await recommendCitiesForSpending(
          exportPeriodRows,
          exportPeriodAnalysis,
          exportPeriodLabel,
          householdSize,
          scenario,
          [baseCity],
          rankedCities.length ? rankedCities.length : 3,
          rankedCities.length ? rankedCities : undefined,
          currencyContext
        )
      : [];

    const bestFitCity =
      bestFitFromComparison?.city ?? recommendations[0]?.city ?? primaryCity;
    const bestFitSummary =
      citySummaries.find((entry) => entry.city === bestFitCity) ?? bestFitFromComparison;
    const bestFitResult =
      cityResults.find((result) => result.reference_city === bestFitCity) ??
      bestFitFromComparison?.result ??
      primaryResult;
    const reportAffordability =
      bestFitSummary?.affordability ??
      (bestFitResult && exportPeriodAnalysis
        ? computeScenarioAffordability(
            exportPeriodAnalysis,
            bestFitResult,
            scenario,
            currencyContext
          )
        : primaryAffordability);
    const reportPrimaryResult = bestFitResult
      ? applyScenarioToLocationResult(bestFitResult, lifestyle)
      : adjustedPrimaryResult;

    const readiness =
      reportAffordability && exportPeriodAnalysis
        ? calculateCityRelocationReadiness(
            reportAffordability.scenarioIncomeDisplay,
            relocationProfile.savingsBalance,
            reportAffordability.displayReferenceCost,
            bestFitCity
          )
        : exportPeriodAnalysis
          ? calculateCityRelocationReadiness(
              convertIncome(exportPeriodAnalysis.total_income) *
                (1 + incomeChangePct / 100),
              relocationProfile.savingsBalance,
              0,
              bestFitCity
            )
          : {
              runwayMonths: null,
              runwayLabel: "",
              moveReadinessPct: 0,
              moveReadinessLabel: "",
              incomeCoveragePct: 0,
              incomeCoverageLabel: "",
            };

    return {
      generatedAt: new Date().toLocaleString(),
      periodLabel: exportPeriodLabel,
      baseCity,
      primaryCity,
      bestFitCity,
      displayCurrency: settings.displayCurrency,
      householdSize,
      incomeChangePct,
      lifestyleLabel: lifestyleOption?.label ?? lifestyle,
      lifestyleDescription: lifestyleOption?.description ?? "",
      timeline: relocationProfile.timeline,
      data,
      affordability: reportAffordability,
      readiness,
      savingsBalance: relocationProfile.savingsBalance,
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
      userBenchmarkSpending,
      referenceCostNote: MONTHLY_BENCHMARK_NOTE,
      dataSource: reportPrimaryResult?.metadata?.source,
      dataSourceUpdated: reportPrimaryResult?.metadata?.updated,
      dataLicense: reportPrimaryResult?.metadata?.license,
      formatDisplay,
      formatExpense,
      formatReferenceCost: formatUsd,
      purchasingPowerEntries,
      compositeEntries,
      homeMonthlyCostDisplay,
      financialHealthScore: scenarioHealthScore,
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
    bestFitFromComparison,
    adjustedPrimaryResult,
    periodRows,
    scenario,
    selectedCities,
    currencyContext,
    formatDisplay,
    formatExpense,
    formatUsd,
    convertIncome,
    settings.displayCurrency,
    purchasingPowerEntries,
    compositeEntries,
    homeMonthlyCostDisplay,
    relocationProfile,
    scenarioHealthScore,
  ]);

  function handleBenchmarkChange(city: string, categoryKey: string, value: number) {
    setCityResults((current) =>
      current.map((result) => {
        if (result.reference_city !== city) return result;
        const nextBenchmarks = {
          ...result.reference_benchmarks,
          [categoryKey]: Number.isFinite(value) ? value : 0,
        };
        return rebuildLocationResult(result, spendingRows, nextBenchmarks, householdSize);
      })
    );
  }

  function handleResetCity(city: string) {
    setCityResults((current) =>
      current.map((result) => {
        if (result.reference_city !== city) return result;
        return rebuildLocationResult(
          result,
          spendingRows,
          { ...result.original_benchmarks },
          householdSize
        );
      })
    );
  }

  function updateSavingsBalance(value: string) {
    const parsed = value.trim() === "" ? null : Number(value);
    setRelocationProfile((current) => ({
      ...current,
      savingsBalance: parsed !== null && Number.isFinite(parsed) ? Math.max(0, parsed) : null,
    }));
    setProfileSavedNotice("");
  }

  function updateRelocationTimeline(timeline: RelocationTimeline | "") {
    setRelocationProfile((current) => ({
      ...current,
      timeline: timeline || null,
    }));
    setProfileSavedNotice("Profile saved for this session.");
    window.setTimeout(() => setProfileSavedNotice(""), 4000);
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

  const buildCustomReportPayload = useCallback(async (selection: import("@/lib/types").PeriodReportSelection) => {
    const { periodLabel, periodAnalysis } = resolvePeriodReportSelection(
      data.period_rows,
      data.periods,
      selection
    );

    const effectivePeriod =
      selection.mode === "single" ? selection.period : selection.end;
    const effectiveRows = isAveragePeriod
      ? buildAveragePeriodRows(data.period_rows)
      : selection.mode === "range"
        ? combinePeriodRowsInRange(
            data.period_rows,
            data.periods,
            selection.start,
            selection.end
          )
        : data.period_rows[effectivePeriod] ?? [];

    const effectiveAnalysis = isAveragePeriod
      ? analyzeAveragePeriods(data.period_rows)
      : periodAnalysis;

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
            effectiveRows,
            effectiveAnalysis,
            effectivePeriod,
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
      periodLabel,
      periodSelection: selection,
      baseCity,
      displayCurrency: settings.displayCurrency,
      data,
      periodAnalysis: effectiveAnalysis,
      recommendations,
      formatIncome,
      formatExpense,
    };
  }, [
    isAveragePeriod,
    citySummaries,
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

      <section className="card">
        <h3>Can I afford to move?</h3>
        <p>
          Compare your monthly spending against Balkan, European, and North American reference
          cities. Savings runway, move readiness, and composite scores use your selections below
          and update for each compare city after you run a comparison.
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
                ({scenarioIncomeNote})
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

        <div className="profile-input-grid relocation-profile-inline">
          <label>
            Total savings (optional)
            <input
              type="number"
              min={0}
              step={100}
              placeholder="e.g. 12000"
              value={relocationProfile.savingsBalance ?? ""}
              onChange={(event) => updateSavingsBalance(event.target.value)}
            />
          </label>
          <label>
            Relocation timeline
            <select
              value={relocationProfile.timeline ?? ""}
              onChange={(event) =>
                updateRelocationTimeline(event.target.value as RelocationTimeline | "")
              }
            >
              <option value="">Not set</option>
              {RELOCATION_TIMELINE_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="section-note relocation-profile-note">
          Income for readiness metrics comes from <strong>{periodDisplayLabel}</strong>. Destination
          cities are Compare city 1–3 above. Savings and what-if income feed composite scores and
          side-by-side readiness — stored only in this browser session.
        </p>
        {profileSavedNotice && <div className="save-notice inline">{profileSavedNotice}</div>}

        <p className="explanatory-callout location-callout">
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

      {cityResults.length > 0 && (
        <>
          <CategoryBenchmarkMatrix
            cities={cityResults}
            userSpending={displayUserSpending}
            periods={data.periods}
            spendingPeriod={spendingPeriod}
            onSpendingPeriodChange={setSpendingPeriod}
            onBenchmarkChange={handleBenchmarkChange}
            onResetCity={handleResetCity}
            rentIsEstimated={rentIsEstimated}
            currentLocationLabel={baseCity.split(",")[0]}
          />

          {selectedCities.length > 0 && (
            <MultiCityCostComparison
              baseCity={baseCity}
              cities={selectedCities}
              formatUsd={formatUsd}
            />
          )}
        </>
      )}

      {citySummaries.length > 0 && (
        <>
          <PurchasingPowerIndexPanel homeCity={baseCity} entries={purchasingPowerEntries} />
          <CompositeScoresPanel
            entries={compositeEntries}
            customBenchmarksActive={customBenchmarksActive}
          />
          <CityCompareGrid
            summaries={citySummaries}
            formatAmount={formatDisplay}
            displayCurrency={settings.displayCurrency}
            compositeEntries={compositeEntries}
            savingsBalance={relocationProfile.savingsBalance}
            scenarioIncomeDisplay={scenarioIncomeDisplay}
            customBenchmarksActive={customBenchmarksActive}
          />
        </>
      )}

      <RelocationReportExport
        periods={data.periods}
        defaultPeriod={locationPeriod}
        buildPayload={buildReportPayload}
        disabled={!periodAnalysis}
      />

      <CustomReportExport
        buildPayload={buildCustomReportPayload}
        disabled={!periodAnalysis}
        periods={data.periods}
        requirePeriodSelection
      />
    </div>
  );
}
