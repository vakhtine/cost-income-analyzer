import { buildMonthlyBenchmarks, MONTHLY_BENCHMARK_NOTE } from "@/lib/benchmark-calculator";
import {
  benchmarkCategoryLabel,
  benchmarkKeyFromComparisonLabel,
} from "@/lib/benchmark-categories";
import {
  ALL_REFERENCE_CITIES,
  CATEGORY_ALIASES,
  WHERENEXT_CITY_KEYS,
} from "@/lib/constants";
import {
  STATIC_BENCHMARK_META,
  STATIC_CITY_BENCHMARKS,
} from "@/lib/static-city-benchmarks";
import { LocationCompareResult, LocationComparison, Transaction } from "@/lib/types";
import { filterExpenseTransactions } from "@/lib/transaction-filters";
import { comparisonGapPct, pctChange, round2 } from "@/lib/utils";
import { fetchWhereNextCityPrices } from "@/lib/wherenext-api";

type WhereNextItem = {
  category: string;
  item: string;
  price_usd: number;
};

type WhereNextResponse = {
  metadata: {
    title: string;
    source: string;
    updated: string;
    license: string;
    data_source?: string;
    city?: string;
  };
  data: WhereNextItem[];
};

export function totalMonthlyBenchmark(
  benchmarks: Record<string, number>,
  householdSize: number
) {
  return round2(
    Object.values(benchmarks).reduce((sum, value) => sum + value, 0) * householdSize
  );
}

export function getUserBenchmarkSpending(rows: Transaction[]) {
  const totals = new Map<string, number>();
  for (const row of filterExpenseTransactions(rows)) {
    const key = CATEGORY_ALIASES[row.category.trim().toLowerCase()];
    if (!key) continue;
    totals.set(key, (totals.get(key) ?? 0) + row.abs_amount);
  }
  return Object.fromEntries(
    [...totals.entries()].map(([key, value]) => [key, round2(value)])
  );
}

export function buildComparisons(
  rows: Transaction[],
  benchmarks: Record<string, number>,
  householdSize: number
) {
  const userTotals = getUserBenchmarkSpending(rows);
  const comparisons: LocationComparison[] = [];

  for (const [category, benchmarkValue] of Object.entries(benchmarks)) {
    const referenceAmount = benchmarkValue * householdSize;
    if (!referenceAmount) continue;
    const userAmount = userTotals[category] ?? 0;
    const difference = userAmount - referenceAmount;
    const difference_pct = comparisonGapPct(userAmount, referenceAmount);
    let status = "Near reference average";
    if (difference_pct !== null) {
      if (difference_pct > 15) status = "Above reference average";
      if (difference_pct < -15) status = "Below reference average";
    } else if (userAmount === 0) {
      status = "No user spending in this category";
    }
    comparisons.push({
      category: benchmarkCategoryLabel(category),
      user_amount: round2(userAmount),
      reference_amount: round2(referenceAmount),
      difference: round2(difference),
      difference_pct,
      status,
    });
  }

  comparisons.sort((a, b) => {
    const aGap = a.difference_pct === null ? 0 : Math.abs(a.difference_pct);
    const bGap = b.difference_pct === null ? 0 : Math.abs(b.difference_pct);
    return bGap - aGap;
  });
  return comparisons;
}

/** Recompute category gaps using matrix-style user spending (includes estimated rent). */
export function rebuildCategoryGapsFromUserSpending(
  comparisons: LocationComparison[],
  userSpending: Record<string, number>
): LocationComparison[] {
  const rebuilt: LocationComparison[] = [];

  for (const row of comparisons) {
    const key = benchmarkKeyFromComparisonLabel(row.category);
    const userAmount = round2(key ? (userSpending[key] ?? 0) : row.user_amount);
    const referenceAmount = row.reference_amount;
    if (referenceAmount <= 0) continue;

    const difference = round2(userAmount - referenceAmount);
    const difference_pct = round2(
      ((userAmount - referenceAmount) / referenceAmount) * 100
    );
    let status = "Near reference average";
    if (difference_pct > 15) status = "Above reference average";
    else if (difference_pct < -15) status = "Below reference average";
    else if (userAmount === 0) status = "No user spending in this category";

    rebuilt.push({
      ...row,
      user_amount: userAmount,
      difference,
      difference_pct,
      status,
    });
  }

  rebuilt.sort(
    (a, b) => Math.abs(b.difference_pct ?? 0) - Math.abs(a.difference_pct ?? 0)
  );
  return rebuilt;
}

export function referenceSavingsPct(userAmount: number, referenceAmount: number) {
  if (!referenceAmount) return 0;
  return round2(((referenceAmount - userAmount) / referenceAmount) * 100);
}

function buildResult(
  periodLabel: string,
  referenceCityLabel: string,
  householdSize: number,
  rows: Transaction[],
  benchmarks: Record<string, number>,
  metadata: LocationCompareResult["metadata"]
): LocationCompareResult {
  const normalized = Object.fromEntries(
    Object.entries(benchmarks).map(([key, value]) => [key, round2(value)])
  );

  return {
    period_label: periodLabel,
    reference_city: referenceCityLabel,
    household_size: householdSize,
    reference_monthly_total: totalMonthlyBenchmark(normalized, householdSize),
    reference_benchmarks: { ...normalized },
    original_benchmarks: { ...normalized },
    comparisons: buildComparisons(rows, normalized, householdSize),
    metadata,
    comparison_basis: "monthly",
  };
}

export function rebuildLocationResult(
  result: LocationCompareResult,
  rows: Transaction[],
  benchmarks: Record<string, number>,
  householdSize = result.household_size
): LocationCompareResult {
  const normalized = Object.fromEntries(
    Object.entries(benchmarks).map(([key, value]) => [key, round2(value)])
  );

  return {
    ...result,
    household_size: householdSize,
    reference_monthly_total: totalMonthlyBenchmark(normalized, householdSize),
    reference_benchmarks: { ...normalized },
    comparisons: buildComparisons(rows, normalized, householdSize),
  };
}

export async function fetchLiveCityList() {
  const payload = await fetchWhereNextCityPrices<{ data: { city_name: string }[] }>();
  return payload.data.map((city) => `${city.city_name}`);
}

function buildStaticReferenceResult(
  rows: Transaction[],
  referenceCityLabel: string,
  householdSize: number,
  periodLabel: string,
  liveUnavailable = false
): LocationCompareResult {
  const staticBenchmarks = STATIC_CITY_BENCHMARKS[referenceCityLabel];
  if (!staticBenchmarks) {
    throw new Error(`Benchmark data is not available for ${referenceCityLabel}.`);
  }

  return buildResult(
    periodLabel,
    referenceCityLabel,
    householdSize,
    rows,
    staticBenchmarks,
    {
      city: referenceCityLabel,
      ...STATIC_BENCHMARK_META,
      source: liveUnavailable
        ? `${STATIC_BENCHMARK_META.source} (live data unavailable)`
        : STATIC_BENCHMARK_META.source,
    }
  );
}

export async function compareToLiveReference(
  rows: Transaction[],
  referenceCityLabel: string,
  householdSize: number,
  periodLabel: string
): Promise<LocationCompareResult> {
  const cityKey = WHERENEXT_CITY_KEYS[referenceCityLabel];
  if (cityKey) {
    try {
      const payload = await fetchWhereNextCityPrices<WhereNextResponse>(cityKey);
      const benchmarks = buildMonthlyBenchmarks(payload.data);

      return buildResult(
        periodLabel,
        referenceCityLabel,
        householdSize,
        rows,
        benchmarks,
        {
          city: referenceCityLabel,
          source: payload.metadata.data_source ?? payload.metadata.source,
          updated: payload.metadata.updated,
          license: payload.metadata.license,
          citation: `WhereNext City Price Dataset (${payload.metadata.updated}) — ${payload.metadata.license}. ${MONTHLY_BENCHMARK_NOTE}`,
        }
      );
    } catch {
      return buildStaticReferenceResult(
        rows,
        referenceCityLabel,
        householdSize,
        periodLabel,
        true
      );
    }
  }

  return buildStaticReferenceResult(
    rows,
    referenceCityLabel,
    householdSize,
    periodLabel
  );
}

export { MONTHLY_BENCHMARK_NOTE };

export function hasCustomBenchmarks(results: LocationCompareResult[]) {
  return results.some((result) =>
    Object.keys(result.reference_benchmarks).some(
      (key) => result.reference_benchmarks[key] !== result.original_benchmarks[key]
    )
  );
}

export function buildMatrixCityOrder(baseCity: string, compareCities: string[]) {
  const ordered: string[] = [];
  const seen = new Set<string>();
  const push = (city: string) => {
    const key = city.trim().toLowerCase();
    if (!city || seen.has(key)) return;
    seen.add(key);
    ordered.push(city);
  };
  push(baseCity);
  for (const city of compareCities) push(city);
  return ordered;
}

export type MatrixCityColumn = {
  city: string;
  result: LocationCompareResult | null;
};

export function orderCityCompareResults(
  cityOrder: string[],
  results: LocationCompareResult[]
): LocationCompareResult[] {
  return resolveMatrixCityColumns(cityOrder, results)
    .map((column) => column.result)
    .filter((result): result is LocationCompareResult => Boolean(result));
}

export function resolveMatrixCityColumns(
  cityOrder: string[],
  results: LocationCompareResult[]
): MatrixCityColumn[] {
  return cityOrder.map((city) => ({
    city,
    result:
      results.find(
        (result) =>
          result.reference_city.trim().toLowerCase() === city.trim().toLowerCase()
      ) ?? null,
  }));
}

export function missingMatrixCities(
  cityOrder: string[],
  results: LocationCompareResult[]
) {
  const loaded = new Set(results.map((result) => result.reference_city.trim().toLowerCase()));
  return cityOrder.filter((city) => !loaded.has(city.trim().toLowerCase()));
}

function uniquePreservingOrder(cities: string[]) {
  const seen = new Set<string>();
  return cities.filter((city) => {
    const key = city.trim().toLowerCase();
    if (!city || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function compareMultipleCities(
  rows: Transaction[],
  cities: string[],
  householdSize: number,
  periodLabel: string
): Promise<LocationCompareResult[]> {
  const uniqueCities = uniquePreservingOrder(cities.filter(Boolean));
  const results = await Promise.allSettled(
    uniqueCities.map((city) =>
      compareToLiveReference(rows, city, householdSize, periodLabel)
    )
  );

  const fulfilled = uniqueCities.flatMap((city, index) => {
    const result = results[index];
    return result?.status === "fulfilled" ? [result.value] : [];
  });

  if (!fulfilled.length) {
    const rejected = results.find((result) => result.status === "rejected");
    if (rejected?.status === "rejected") {
      throw rejected.reason instanceof Error
        ? rejected.reason
        : new Error("Could not load city data.");
    }
  }

  return orderCityCompareResults(uniqueCities, fulfilled);
}

export async function fetchCityMonthlyCost(city: string, householdSize = 1) {
  const emptyRows: Transaction[] = [];
  const result = await compareToLiveReference(emptyRows, city, householdSize, "reference");
  return result.reference_monthly_total;
}

export async function fetchCityRentEstimate(
  city: string,
  householdSize: number,
  lifestyleMultiplier: number
) {
  const emptyRows: Transaction[] = [];
  const result = await compareToLiveReference(emptyRows, city, 1, "reference");
  const baseRent = result.reference_benchmarks.rent ?? 0;
  return round2(baseRent * householdSize * lifestyleMultiplier);
}

export const SUPPORTED_REFERENCE_CITIES = ALL_REFERENCE_CITIES;

export function isLiveDataCity(city: string) {
  return Boolean(WHERENEXT_CITY_KEYS[city]);
}
