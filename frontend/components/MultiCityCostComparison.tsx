"use client";

import { useEffect, useState } from "react";
import { CategoryIcon } from "@/components/CategoryIcon";
import {
  cityShortName,
  CityCostProfile,
  COST_ITEM_CATEGORIES,
  costDifferencePct,
  fetchCityCostProfiles,
  sumCategoryItems,
} from "@/lib/city-cost-items";

type Props = {
  baseCity: string;
  cities: string[];
  formatUsd: (amount: number) => string;
};

export function MultiCityCostComparison({ baseCity, cities, formatUsd }: Props) {
  const destinationCities = [...new Set(cities.filter((city) => city && city !== baseCity))];
  const [profiles, setProfiles] = useState<Record<string, CityCostProfile>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!destinationCities.length) {
      setProfiles({});
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    fetchCityCostProfiles([baseCity, ...destinationCities])
      .then((next) => {
        if (!cancelled) setProfiles(next);
      })
      .catch((fetchError) => {
        if (!cancelled) {
          setError(
            fetchError instanceof Error
              ? fetchError.message
              : "Could not load typical costs for selected cities."
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [baseCity, destinationCities.join("|")]);

  if (!destinationCities.length) return null;

  const baseProfile = profiles[baseCity];
  const loadedDestinations = destinationCities.filter((city) => profiles[city]);

  return (
    <section className="card multi-city-cost-comparison">
      <div className="section-heading">
        <h3>Typical costs across your chosen cities</h3>
        <p>
          Restaurants, groceries, and transport &amp; utilities compared side-by-side for your
          current city and each selected destination.
        </p>
      </div>

      {loading && <p className="section-note">Loading typical local costs...</p>}
      {error && <div className="error">{error}</div>}

      {baseProfile && loadedDestinations.length > 0 && (
        <div className="expatistan-cost-table-wrap">
          <table className="expatistan-cost-table multi-city-cost-table">
            <thead>
              <tr>
                <th>Category</th>
                <th>{cityShortName(baseCity)}</th>
                {loadedDestinations.map((city) => (
                  <th key={city}>{cityShortName(city)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COST_ITEM_CATEGORIES.map((category, categoryIndex) => {
                const baseTotal = sumCategoryItems(baseProfile, category.keys);
                return (
                  <tr
                    key={category.label}
                    className={categoryIndex % 2 === 0 ? "expatistan-stripe" : ""}
                  >
                    <td className="expatistan-category-cell">
                      <CategoryIcon category={category.label} size={56} className="expatistan-category-icon-badge" />
                      {category.label}
                    </td>
                    <td>
                      <strong>{formatUsd(baseTotal)}</strong>
                    </td>
                    {loadedDestinations.map((city) => {
                      const profile = profiles[city];
                      if (!profile) return <td key={city}>—</td>;
                      const total = sumCategoryItems(profile, category.keys);
                      const diff = costDifferencePct(baseTotal, total);
                      const cheaper = diff < 0;
                      return (
                        <td key={city}>
                          <div className="expatistan-price-cell">
                            <strong>{formatUsd(total)}</strong>
                            <span
                              className={`expatistan-diff ${cheaper ? "cheaper" : diff > 0 ? "pricier" : ""}`}
                            >
                              {diff > 0 ? "+" : ""}
                              {diff.toFixed(1)}% vs {cityShortName(baseCity)}
                            </span>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="expatistan-source-note">
            Category totals sum typical item prices in USD for each city. Source: WhereNext / public
            cost-of-living references.
          </p>
        </div>
      )}
    </section>
  );
}
