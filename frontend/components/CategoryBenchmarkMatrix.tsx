"use client";

import { BENCHMARK_CATEGORIES } from "@/lib/benchmark-categories";
import { LocationCompareResult } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { CategoryIcon } from "@/components/CategoryIcon";
type Props = {
  cities: LocationCompareResult[];
  userSpending: Record<string, number>;
  periods: string[];
  spendingPeriod: string;
  onSpendingPeriodChange: (period: string) => void;
  onBenchmarkChange: (city: string, categoryKey: string, value: number) => void;
  onResetCity: (city: string) => void;
  rentIsEstimated?: boolean;
  currentLocationLabel?: string;
};

export function CategoryBenchmarkMatrix({
  cities,
  userSpending,
  periods,
  spendingPeriod,
  onSpendingPeriodChange,
  onBenchmarkChange,
  onResetCity,
  rentIsEstimated = false,
  currentLocationLabel,
}: Props) {
  if (!cities.length) return null;

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
          <strong> Relocation fit</strong> and <strong>financial health scores</strong> for each
          compare city recalculate immediately from the updated category totals.
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
              {cities.map((city) => (
                <th key={city.reference_city}>{city.reference_city.split(",")[0]}</th>
              ))}
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
                </td>                <td className={category.key === "rent" && rentIsEstimated ? "estimated-rent-cell" : ""}>
                  {formatCurrency(userSpending[category.key] ?? 0)}
                  {category.key === "rent" && rentIsEstimated ? (
                    <span className="estimated-rent-tag">est.</span>
                  ) : null}
                </td>
                {cities.map((city) => {
                  const benchmark = city.reference_benchmarks[category.key] ?? 0;
                  const adjusted = benchmark * city.household_size;
                  const isEdited =
                    city.reference_benchmarks[category.key] !==
                    city.original_benchmarks[category.key];

                  return (
                    <td key={`${city.reference_city}-${category.key}`}>
                      <input
                        type="number"
                        min={0}
                        step={10}
                        className={`benchmark-input ${isEdited ? "edited" : ""}`}
                        value={Math.round(benchmark)}
                        onChange={(event) =>
                          onBenchmarkChange(
                            city.reference_city,
                            category.key,
                            Number(event.target.value)
                          )
                        }
                      />
                      <div className="benchmark-sub">
                        {formatCurrency(adjusted)}/mo
                        {city.household_size > 1 ? ` · ${city.household_size} people` : ""}
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
              <td><strong>{formatCurrency(userSpendingTotal)}</strong></td>
              {cities.map((city) => (
                <td key={`${city.reference_city}-total`}>
                  <strong>{formatCurrency(city.reference_monthly_total)}</strong>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      <div className="benchmark-actions">
        {cities.map((city) => {
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
