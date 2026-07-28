import { buildMonthlyBenchmarks, MONTHLY_BENCHMARK_NOTE } from "@/lib/benchmark-calculator";
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
import { round2 } from "@/lib/utils";
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
    const difference_pct = (difference / referenceAmount) * 100;
    let status = "Near reference average";
    if (difference_pct > 15) status = "Above reference average";
    if (difference_pct < -15) status = "Below reference average";
    comparisons.push({
      category: category[0].toUpperCase() + category.slice(1),
      user_amount: round2(userAmount),
      reference_amount: round2(referenceAmount),
      difference: round2(difference),
      difference_pct: round2(difference_pct),
      status,
    });
  }

  comparisons.sort((a, b) => Math.abs(b.difference_pct) - Math.abs(a.difference_pct));
  return comparisons;
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

export async function compareToLiveReference(
  rows: Transaction[],
  referenceCityLabel: string,
  householdSize: number,
  periodLabel: string
): Promise<LocationCompareResult> {
  const staticBenchmarks = STATIC_CITY_BENCHMARKS[referenceCityLabel];
  if (staticBenchmarks) {
    return buildResult(
      periodLabel,
      referenceCityLabel,
      householdSize,
      rows,
      staticBenchmarks,
      {
        city: referenceCityLabel,
        ...STATIC_BENCHMARK_META,
      }
    );
  }

  const cityKey = WHERENEXT_CITY_KEYS[referenceCityLabel];
  if (!cityKey) {
    throw new Error(`Benchmark data is not available for ${referenceCityLabel}.`);
  }

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
}

export { MONTHLY_BENCHMARK_NOTE };

export async function compareMultipleCities(
  rows: Transaction[],
  cities: string[],
  householdSize: number,
  periodLabel: string
): Promise<LocationCompareResult[]> {
  const uniqueCities = [...new Set(cities.filter(Boolean))];
  const results = await Promise.allSettled(
    uniqueCities.map((city) =>
      compareToLiveReference(rows, city, householdSize, periodLabel)
    )
  );

  const fulfilled = results.flatMap((result) =>
    result.status === "fulfilled" ? [result.value] : []
  );

  if (!fulfilled.length) {
    const rejected = results.find((result) => result.status === "rejected");
    if (rejected?.status === "rejected") {
      throw rejected.reason instanceof Error
        ? rejected.reason
        : new Error("Could not load city data.");
    }
  }

  return fulfilled;
}

export async function fetchCityMonthlyCost(city: string, householdSize = 1) {
  const emptyRows: Transaction[] = [];
  const result = await compareToLiveReference(emptyRows, city, householdSize, "reference");
  return result.reference_monthly_total;
}

export const SUPPORTED_REFERENCE_CITIES = ALL_REFERENCE_CITIES;

export function isLiveDataCity(city: string) {
  return Boolean(WHERENEXT_CITY_KEYS[city]);
}
