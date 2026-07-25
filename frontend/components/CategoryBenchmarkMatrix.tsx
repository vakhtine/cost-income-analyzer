"use client";

import { BENCHMARK_CATEGORIES } from "@/lib/benchmark-categories";
import { LocationCompareResult } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { CategoryIcon } from "@/components/CategoryIcon";
type Props = {
  cities: LocationCompareResult[];
  userSpending: Record<string, number>;
  periodLabel?: string;
  onBenchmarkChange: (city: string, categoryKey: string, value: number) => void;
  onResetCity: (city: string) => void;
};

export function CategoryBenchmarkMatrix({
  cities,
  userSpending,
  periodLabel,
  onBenchmarkChange,
  onResetCity,
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
          Compare rent, groceries, gas, and other monthly categories across destinations. Edit any
          city value to model your own rent quote or lifestyle assumptions.
          {periodLabel ? (
            <>
              {" "}
              <strong>Your spending</strong> reflects period <strong>{periodLabel}</strong> — change
              the period selector above if rent or income was entered under a different month.
            </>
          ) : null}
        </p>
      </div>

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
                </td>                <td>{formatCurrency(userSpending[category.key] ?? 0)}</td>
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
