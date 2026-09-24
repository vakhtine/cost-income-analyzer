"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  buildMatrixCityOrder,
  compareMultipleCities,
  missingMatrixCities,
  resolveMatrixCityColumns,
  fetchCityMonthlyCost,
  fetchCityRentEstimate,
  getUserBenchmarkSpending,
  hasCustomBenchmarks,
  MONTHLY_BENCHMARK_NOTE,
  rebuildLocationResult,
} from "@/lib/city-data";
import { totalBenchmarkCategorySpending } from "@/lib/benchmark-categories";
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
import { convertAmount, FALLBACK_EXCHANGE_RATES } from "@/lib/currency";
import { adjustHealthScoreForScenarioIncome, roundHealthScore } from "@/lib/health-score";
import { loadRelocationProfile, calculateCityRelocationReadiness, RELOCATION_TIMELINE_OPTIONS, RelocationProfile, RelocationTimeline, saveRelocationProfile } from "@/lib/relocation-profile";
import {
  applyScenarioToLocationResult,
  buildCitySummaries,
  computeScenarioAffordability,
} from "@/lib/relocation-scenario";
import { AffordabilityCurrencyContext } from "@/lib/relocation-affordability";
import { combinePeriodRowsInRange } from "@/lib/spending-metrics";
import { round2 } from "@/lib/utils";
import { AnalyzeResponse, LocationCompareResult } from "@/lib/types";
import { LIFESTYLE_OPTIONS, LifestyleLevel, lifestyleMultiplier } from "@/lib/wizard";

function pickReplacementCompareCity(excluded: string[]) {
  const excludedKeys = new Set(excluded.map((city) => city.trim().toLowerCase()));
  return (
    ALL_REFERENCE_CITIES.find((city) => !excludedKeys.has(city.trim().toLowerCase())) ?? ""
  );
}

function sanitizeCompareSelections(
  baseCity: string,
  primary: string,
  compare2: string,
  compare3: string
) {
  const used = new Set<string>([baseCity.trim().toLowerCase()]);
  const resolve = (current: string, allowEmpty: boolean) => {
    if (allowEmpty && !current) return "";
    const key = current.trim().toLowerCase();
    if (current && !used.has(key)) {
      used.add(key);
      return current;
    }
    const next = pickReplacementCompareCity([
      baseCity,
      ...Array.from(used),
    ]);
    if (next) used.add(next.trim().toLowerCase());
    return allowEmpty && !next ? "" : next;
  };

  return {
    primary: resolve(primary, false),
    compare2: resolve(compare2, false),
    compare3: resolve(compare3, true),
  };
}

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
  const hasComparedRef = useRef(false);
  const compareRequestIdRef = useRef(0);
  const runComparisonRef = useRef<(() => Promise<void>) | null>(null);
  const [relocationProfile, setRelocationProfile] = useState<RelocationProfile>(() =>
    loadRelocationProfile()
  );
  const [profileSavedNotice, setProfileSavedNotice] = useState("");
  const [spendingPeriod, setSpendingPeriod] = useState(locationPeriod);
  const [homeMonthlyCostDisplay, setHomeMonthlyCostDisplay] = useState<number | null>(null);
  const { formatIncome, formatExpense, formatUsd, formatDisplay, convertIncome, convertExpense, convertReferenceCost, settings, rates } =
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
  const [userRentOverride, setUserRentOverride] = useState<number | null>(null);
  const rentIsEstimated =
    (spendingUserSpending.rent ?? 0) === 0 && (userRentOverride ?? estimatedRent) !== null;

  useEffect(() => {
    setUserRentOverride(null);
  }, [spendingPeriod, baseCity, householdSize, lifestyle, spendingUserSpending.rent]);

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
    if ((spendingUserSpending.rent ?? 0) > 0) {
      return spendingUserSpending;
    }
    const rent = userRentOverride ?? estimatedRent;
    if (rent !== null) {
      return { ...spendingUserSpending, rent };
    }
    return spendingUserSpending;
  }, [spendingUserSpending, userRentOverride, estimatedRent]);

  function handleUserRentChange(value: number) {
    setUserRentOverride(Number.isFinite(value) ? Math.max(0, value) : 0);
  }

  const isAveragePeriod = locationPeriod === AVERAGE_PERIOD_LABEL;
  const periodRows = useMemo(
    () =>
      isAveragePeriod
        ? buildAveragePeriodRows(data.period_rows)
        : data.period_rows[locationPeriod] ?? [],
    [isAveragePeriod, data.period_rows, locationPeriod]
  );
  const periodAnalysis = isAveragePeriod
    ? analyzeAveragePeriods(data.period_rows)
    : data.period_analysis[locationPeriod];
  const periodDisplayLabel = isAveragePeriod ? "Average (all periods)" : locationPeriod;
  const selectedCities = useMemo(
    () => [primaryCity, compareCity2, compareCity3].filter(Boolean),
    [primaryCity, compareCity2, compareCity3]
  );
  const matrixCityOrder = useMemo(
    () => buildMatrixCityOrder(baseCity, selectedCities),
    [baseCity, primaryCity, compareCity2, compareCity3]
  );
  const matrixColumns = useMemo(
    () => resolveMatrixCityColumns(matrixCityOrder, cityResults),
    [matrixCityOrder, cityResults]
  );
  const pendingMatrixCities = useMemo(
    () => missingMatrixCities(matrixCityOrder, cityResults),
    [matrixCityOrder, cityResults]
  );

  useEffect(() => {
    const next = sanitizeCompareSelections(baseCity, primaryCity, compareCity2, compareCity3);
    if (next.primary !== primaryCity) setPrimaryCity(next.primary);
    if (next.compare2 !== compareCity2) setCompareCity2(next.compare2);
    if (next.compare3 !== compareCity3) setCompareCity3(next.compare3);
  }, [baseCity]);

  useEffect(() => {
    setCityResults([]);
    setCompareNotice("");
    hasComparedRef.current = false;
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
    const activeRates = rates ?? FALLBACK_EXCHANGE_RATES;
    return {
      incomeCurrency: settings.incomeCurrency,
      expenseCurrency: settings.expenseCurrency,
      displayCurrency: settings.displayCurrency,
      rates: activeRates,
    };
  }, [settings, rates]);

  const adjustedPrimaryResult = useMemo(() => {
    if (!primaryResult) return null;
    return applyScenarioToLocationResult(primaryResult, lifestyle);
  }, [primaryResult, lifestyle]);

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

  const relocationHealthContext = useMemo(
    () => ({
      baseHealthScore,
      expenseRows: periodRows,
      focusPeriod: periodDisplayLabel,
    }),
    [baseHealthScore, periodRows, periodDisplayLabel]
  );

  const primaryAffordability = useMemo(() => {
    if (!primaryResult || !periodAnalysis) return null;
    return computeScenarioAffordability(
      periodAnalysis,
      primaryResult,
      scenario,
      currencyContext,
      undefined,
      undefined,
      relocationHealthContext
    );
  }, [primaryResult, periodAnalysis, scenario, currencyContext, relocationHealthContext]);

  const citySummaries = useMemo(() => {
    if (!periodAnalysis || !cityResults.length) return [];
    return buildCitySummaries(
      periodAnalysis,
      cityResults,
      scenario,
      currencyContext,
      baseCity,
      undefined,
      relocationHealthContext
    );
  }, [periodAnalysis, cityResults, scenario, currencyContext, baseCity, relocationHealthContext]);

  const scenarioHealthScore = useMemo(() => {
    if (!periodAnalysis) return roundHealthScore(baseHealthScore.overall);
    const baseIncome = baseHealthScore.metrics?.total_income ?? periodAnalysis.total_income;
    const incomeFactor = 1 + incomeChangePct / 100;
    const scenarioIncome = convertIncome(baseIncome * incomeFactor);
    const scenarioExpenses =
      homeMonthlyCostDisplay ??
      convertExpense(baseHealthScore.metrics?.total_expenses ?? periodAnalysis.total_expenses);
    return roundHealthScore(
      adjustHealthScoreForScenarioIncome(
        baseHealthScore,
        scenarioIncome,
        scenarioExpenses,
        periodRows,
        {
          focusPeriod: periodDisplayLabel,
          nonEssentialTotal:
            baseHealthScore.metrics?.non_essential_total !== undefined
              ? convertExpense(baseHealthScore.metrics.non_essential_total)
              : undefined,
        }
      ).overall
    );
  }, [
    baseHealthScore,
    periodAnalysis,
    periodRows,
    incomeChangePct,
    periodDisplayLabel,
    convertIncome,
    convertExpense,
    homeMonthlyCostDisplay,
  ]);

  const homeComparisonCostDisplay = useMemo(() => {
    const total = totalBenchmarkCategorySpending(displayUserSpending);
    return round2(convertExpense(total));
  }, [displayUserSpending, convertExpense]);

  const destinationSummaries = useMemo(
    () =>
      citySummaries.filter(
        (summary) =>
          summary.city.trim().toLowerCase() !== baseCity.trim().toLowerCase()
      ),
    [citySummaries, baseCity]
  );

  const purchasingPowerEntries = useMemo((): PurchasingPowerIndexEntry[] => {
    if (!homeComparisonCostDisplay || !destinationSummaries.length) return [];
    return buildPurchasingPowerIndexEntries(
      baseCity,
      homeComparisonCostDisplay,
      destinationSummaries.map((summary) => ({
        city: summary.city,
        monthlyCost: summary.affordability.displayReferenceCost,
      }))
    );
  }, [baseCity, destinationSummaries, homeComparisonCostDisplay]);

  const compositeEntries = useMemo((): CompositeScoreEntry[] => {
    if (!homeMonthlyCostDisplay || !citySummaries.length) return [];
    return buildCompositeScoreEntries({
      homeCity: baseCity,
      homeMonthlyCost: homeMonthlyCostDisplay,
      homeComparisonCost: homeComparisonCostDisplay,
      baseHealthScore,
      expenseRows: periodRows,
      incomeChangePct,
      toDisplayIncome: convertIncome,
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
    convertIncome,
    convertExpense,
    homeMonthlyCostDisplay,
    homeComparisonCostDisplay,
    relocationProfile.savingsBalance,
  ]);

  const bestFitFromComparison = useMemo(() => {
    if (!destinationSummaries.length) return null;
    return [...destinationSummaries].sort((a, b) => {
      const balanceDiff =
        b.affordability.projectedBalance - a.affordability.projectedBalance;
      if (balanceDiff !== 0) return balanceDiff;
      return (
        a.affordability.displayReferenceCost - b.affordability.displayReferenceCost
      );
    })[0];
  }, [destinationSummaries]);

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
    let rentIsEstimated = false;
    if ((userBenchmarkSpending.rent ?? 0) === 0) {
      try {
        const rent = await fetchCityRentEstimate(
          baseCity,
          householdSize,
          lifestyleMultiplier(lifestyle)
        );
        userBenchmarkSpending = { ...userBenchmarkSpending, rent };
        rentIsEstimated = true;
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
    const homeCompareResult =
      cityResults.find((result) => result.reference_city === baseCity) ?? null;
    const reportAffordability =
      bestFitResult && exportPeriodAnalysis
        ? computeScenarioAffordability(
            exportPeriodAnalysis,
            bestFitResult,
            scenario,
            currencyContext,
            exportPeriodLabel,
            homeCompareResult ?? undefined,
            relocationHealthContext
          )
        : primaryAffordability && exportPeriodAnalysis && primaryResult
          ? computeScenarioAffordability(
              exportPeriodAnalysis,
              primaryResult,
              scenario,
              currencyContext,
              exportPeriodLabel,
              homeCompareResult ?? undefined,
              relocationHealthContext
            )
          : null;
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
      citySummaries: destinationSummaries,
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
      rentIsEstimated,
      referenceCostNote: MONTHLY_BENCHMARK_NOTE,
      dataSource: reportPrimaryResult?.metadata?.source,
      dataSourceUpdated: reportPrimaryResult?.metadata?.updated,
      dataLicense: reportPrimaryResult?.metadata?.license,
      formatDisplay,
      formatExpense,
      formatReferenceCost: formatUsd,
      convertExpense,
      convertReferenceCost,
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
    convertExpense,
    convertReferenceCost,
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

  const runComparison = useCallback(async () => {
    if (!locationPeriod) return;
    const requestId = ++compareRequestIdRef.current;
    setLoading(true);
    onError("");
    try {
      if (!periodRows.length) {
        throw new Error(`No transactions found for ${locationPeriod}.`);
      }
      const citiesToCompare = buildMatrixCityOrder(baseCity, selectedCities);
      const results = await compareMultipleCities(
        periodRows,
        citiesToCompare,
        householdSize,
        locationPeriod
      );
      if (requestId !== compareRequestIdRef.current) return;
      setCityResults(results.map((result) => ({ ...result, base_city: baseCity })));
      hasComparedRef.current = true;
      const missingCities = missingMatrixCities(citiesToCompare, results);
      const usingFallback = results.some((result) =>
        result.metadata.source.includes("live data unavailable")
      );
      setCompareNotice(
        missingCities.length
          ? `Loaded ${results.length} of ${citiesToCompare.length} cities for ${locationPeriod}. Could not load: ${missingCities.join(", ")}.`
          : usingFallback
            ? `Compared ${results.length} cities for ${locationPeriod} using reference benchmarks — live WhereNext data was unavailable for one or more cities.`
            : `Compared ${results.length} cities for ${locationPeriod} — home plus ${selectedCities.length} compare cities in the matrix below.`
      );
    } catch (compareError) {
      if (requestId !== compareRequestIdRef.current) return;
      onError(
        compareError instanceof Error ? compareError.message : "Could not compare locations."
      );
    } finally {
      if (requestId === compareRequestIdRef.current) {
        setLoading(false);
      }
    }
  }, [
    locationPeriod,
    periodRows,
    baseCity,
    selectedCities,
    householdSize,
    onError,
  ]);

  runComparisonRef.current = runComparison;

  const matrixCityOrderKey = matrixCityOrder.join("\0");

  useEffect(() => {
    if (!hasComparedRef.current || !locationPeriod) return;
    void runComparisonRef.current?.();
  }, [matrixCityOrderKey, householdSize, locationPeriod]);

  const buildCustomReportPayload = useCallback(async (selection: import("@/lib/types").PeriodReportSelection) => {
    const { periodLabel, periodAnalysis } = resolvePeriodReportSelection(
      data.period_rows,
      data.periods,
      selection
    );

    const effectivePeriod =
      selection.mode === "single" ? selection.period : selection.end;
    const effectiveRows =
      selection.mode === "range"
        ? combinePeriodRowsInRange(
            data.period_rows,
            data.periods,
            selection.start,
            selection.end
          )
        : data.period_rows[effectivePeriod] ?? [];

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
            periodAnalysis,
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

    const exportPeriod =
      selection.mode === "single" ? selection.period : selection.end;

    const relocation = await buildReportPayload(exportPeriod);

    return {
      generatedAt: new Date().toLocaleString(),
      periodLabel,
      periodSelection: selection,
      baseCity,
      displayCurrency: settings.displayCurrency,
      data,
      periodAnalysis,
      recommendations,
      relocation,
      formatIncome,
      formatExpense,
    };
  }, [
    citySummaries,
    householdSize,
    scenario,
    baseCity,
    settings.displayCurrency,
    data,
    formatIncome,
    formatExpense,
    selectedCities,
    currencyContext,
    buildReportPayload,
  ]);

  return (
    <div className="stack app-tab-content">
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
            columns={matrixColumns}
            loading={loading}
            homeCity={baseCity}
            userSpending={displayUserSpending}
            periods={data.periods}
            spendingPeriod={spendingPeriod}
            onSpendingPeriodChange={setSpendingPeriod}
            onBenchmarkChange={handleBenchmarkChange}
            onResetCity={handleResetCity}
            onUserRentChange={rentIsEstimated ? handleUserRentChange : undefined}
            userRentEdited={userRentOverride !== null}
            rentIsEstimated={rentIsEstimated}
            currentLocationLabel={baseCity.split(",")[0]}
            lifestyle={lifestyle}
            lifestyleLabel={LIFESTYLE_OPTIONS.find((item) => item.id === lifestyle)?.label}
          />
          {pendingMatrixCities.length > 0 && !loading ? (
            <p className="explanatory-callout category-matrix-pending-note">
              Could not load live price data for{" "}
              <strong>{pendingMatrixCities.map((city) => city.split(",")[0]).join(", ")}</strong>.
              Try <strong>Compare selected cities</strong> again or pick a different city.
            </p>
          ) : null}

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
            summaries={destinationSummaries}
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
        defaultSelectedTypes={[
          "expenses-by-category",
          "financial-health",
          "best-fit-cities",
        ]}
      />
    </div>
  );
}
