"use client";

import { BENCHMARK_CATEGORIES } from "@/lib/benchmark-categories";
import { useCurrency } from "@/lib/currency-context";
import { MatrixCityColumn } from "@/lib/city-data";
import { CategoryIcon } from "@/components/CategoryIcon";
import { lifestyleMultiplier, LifestyleLevel } from "@/lib/wizard";

type Props = {
  columns: MatrixCityColumn[];
  homeCity?: string;
  loading?: boolean;
  userSpending: Record<string, number>;
  periods: string[];
  spendingPeriod: string;
  onSpendingPeriodChange: (period: string) => void;
  onBenchmarkChange: (city: string, categoryKey: string, value: number) => void;
  onResetCity: (city: string) => void;
  onUserRentChange?: (value: number) => void;
  userRentEdited?: boolean;
  rentIsEstimated?: boolean;
  currentLocationLabel?: string;
  lifestyle?: LifestyleLevel;
  lifestyleLabel?: string;
};

export function CategoryBenchmarkMatrix({
  columns,
  homeCity,
  loading = false,
  userSpending,
  periods,
  spendingPeriod,
  onSpendingPeriodChange,
  onBenchmarkChange,
  onResetCity,
  onUserRentChange,
  userRentEdited = false,
  rentIsEstimated = false,
  currentLocationLabel,
  lifestyle = "average",
  lifestyleLabel,
}: Props) {
  const { formatExpense, formatUsd } = useCurrency();
  const lifestyleMult = lifestyleMultiplier(lifestyle);

  if (!columns.length) return null;

  const loadedCities = columns.flatMap((column) => (column.result ? [column.result] : []));

  const userSpendingTotal = BENCHMARK_CATEGORIES.reduce(
    (sum, category) => sum + (userSpending[category.key] ?? 0),
    0
  );

  return (
    <section className="card category-matrix">
      <div className="section-heading">
        <h3>Category costs by city</h3>
        <p>
          Default amounts come from live public city price data (WhereNext). Tap any destination
          cell to model your own rent quote or lifestyle — highlighted cells are your overrides.
          Destination totals reflect your selected lifestyle
          {lifestyleLabel ? ` (${lifestyleLabel})` : ""}. Columns show your current city
          {homeCity ? ` (${homeCity.split(",")[0]})` : ""} plus each compare city.{" "}
          <strong> Relocation fit</strong> and <strong>financial health scores</strong> for each
          compare city recalculate immediately from the updated category totals.{" "}
          <strong>Cost vs. home</strong> on city cards compares each destination total below to
          your spending row total (same categories).
        </p>
      </div>

      <label className="analyze-period-label category-matrix-period-label">
        Spending period
        <select value={spendingPeriod} onChange={(event) => onSpendingPeriodChange(event.target.value)}>
          {periods.map((period) => (
            <option key={period} value={period}>
              {period}
            </option>
          ))}
        </select>
      </label>

      {rentIsEstimated ? (
        <p className="explanatory-callout category-matrix-rent-note">
          No rent expense appears in your uploaded financial records for this period. An approximate
          equivalent rent for {currentLocationLabel ? <strong>{currentLocationLabel}</strong> : "your current location"}{" "}
          is shown in <strong>Your spending → Rent</strong>, estimated from public city price data
          (WhereNext) for your selected lifestyle and household size — the same sources used for
          compare cities.
        </p>
      ) : null}

      <div className="table-scroll">
        <table className="category-matrix-table">
          <thead>
            <tr>
              <th>Category</th>
              <th>Your spending</th>
              {columns.map(({ city, result }) => {
                const isHome =
                  homeCity && city.trim().toLowerCase() === homeCity.trim().toLowerCase();
                const pending = !result;
                return (
                  <th key={city}>
                    {city.split(",")[0]}
                    {isHome ? " (home)" : ""}
                    {pending ? (loading ? " …" : " (pending)") : ""}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {BENCHMARK_CATEGORIES.map((category) => (
              <tr key={category.key}>
                <td>
                  <span className="category-label-with-icon">
                    <CategoryIcon category={category.label} size={56} className="category-icon-matrix" />
                    <strong>{category.label}</strong>
                  </span>
                </td>
                <td className={category.key === "rent" && rentIsEstimated ? "estimated-rent-cell" : ""}>
                  {category.key === "rent" && rentIsEstimated && onUserRentChange ? (
                    <>
                      <input
                        type="number"
                        min={0}
                        step={10}
                        className={`benchmark-input ${userRentEdited ? "edited" : ""}`}
                        value={Math.round(userSpending.rent ?? 0)}
                        onChange={(event) =>
                          onUserRentChange(Number(event.target.value))
                        }
                      />
                      <span className="estimated-rent-tag">est.</span>
                    </>
                  ) : (
                    <>
                      {formatExpense(userSpending[category.key] ?? 0)}
                      {category.key === "rent" && rentIsEstimated ? (
                        <span className="estimated-rent-tag">est.</span>
                      ) : null}
                    </>
                  )}
                </td>
                {columns.map(({ city, result }) => {
                  if (!result) {
                    return (
                      <td key={`${city}-${category.key}`} className="matrix-cell-pending">
                        {loading ? "Loading…" : "—"}
                      </td>
                    );
                  }

                  const benchmark = result.reference_benchmarks[category.key] ?? 0;
                  const adjusted = benchmark * result.household_size;
                  const isEdited =
                    result.reference_benchmarks[category.key] !==
                    result.original_benchmarks[category.key];

                  return (
                    <td key={`${city}-${category.key}`}>
                      <input
                        type="number"
                        min={0}
                        step={10}
                        className={`benchmark-input ${isEdited ? "edited" : ""}`}
                        value={Math.round(benchmark)}
                        onChange={(event) =>
                          onBenchmarkChange(
                            result.reference_city,
                            category.key,
                            Number(event.target.value)
                          )
                        }
                      />
                      <div className="benchmark-sub">
                        {formatUsd(adjusted * lifestyleMult)}/mo
                        {result.household_size > 1 ? ` · ${result.household_size} people` : ""}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr className="total-row">
              <td>
                <strong>Total monthly</strong>
              </td>
              <td><strong>{formatExpense(userSpendingTotal)}</strong></td>
              {columns.map(({ city, result }) => (
                <td key={`${city}-total`}>
                  <strong>
                    {result
                      ? formatUsd(result.reference_monthly_total * lifestyleMult)
                      : loading
                        ? "…"
                        : "—"}
                  </strong>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      <div className="benchmark-actions">
        {loadedCities.map((city) => {
          const edited = Object.keys(city.reference_benchmarks).some(
            (key) => city.reference_benchmarks[key] !== city.original_benchmarks[key]
          );
          if (!edited) return null;
          return (
            <button
              key={city.reference_city}
              type="button"
              className="tab"
              onClick={() => onResetCity(city.reference_city)}
            >
              Reset {city.reference_city.split(",")[0]} to live data
            </button>
          );
        })}
      </div>
    </section>
  );
}
