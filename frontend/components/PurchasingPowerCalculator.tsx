"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchCityMonthlyCost } from "@/lib/city-data";
import { REFERENCE_CITY_GROUPS } from "@/lib/constants";
import { useCurrency } from "@/lib/currency-context";
import { convertAmount, formatMoney } from "@/lib/currency";
import {
  calculatePurchasingPowerEquivalent,
  purchasingPowerMultiplier,
  purchasingPowerRatio,
} from "@/lib/purchasing-power";

type Props = {
  defaultSourceCity?: string;
  defaultDestCity?: string;
  householdSize?: number;
};

type StoredResult = {
  amountUsd: number;
  equivalentUsd: number;
  sourceCostUsd: number;
  destCostUsd: number;
};

export function PurchasingPowerCalculator({
  defaultSourceCity = "Abbotsford, Canada",
  defaultDestCity = "Tirana, Albania",
  householdSize = 1,
}: Props) {
  const { settings, rates, formatUsd } = useCurrency();
  const [sourceCity, setSourceCity] = useState(defaultSourceCity);
  const [destCity, setDestCity] = useState(defaultDestCity);
  const [amount, setAmount] = useState("3000");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<StoredResult | null>(null);

  const parsedAmount = useMemo(() => {
    const value = Number.parseFloat(amount.replace(/,/g, ""));
    return Number.isFinite(value) && value > 0 ? value : 0;
  }, [amount]);

  async function handleCalculate() {
    if (!parsedAmount) {
      setError("Enter a valid net income amount.");
      return;
    }
    if (sourceCity === destCity) {
      setError("Choose two different cities.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const [sourceCostUsd, destCostUsd] = await Promise.all([
        fetchCityMonthlyCost(sourceCity, householdSize),
        fetchCityMonthlyCost(destCity, householdSize),
      ]);
      const amountUsd = convertAmount(
        parsedAmount,
        settings.displayCurrency,
        "USD",
        rates!
      );
      const equivalentUsd = calculatePurchasingPowerEquivalent(
        amountUsd,
        sourceCostUsd,
        destCostUsd
      );
      setResult({ amountUsd, equivalentUsd, sourceCostUsd, destCostUsd });
    } catch (calcError) {
      setError(
        calcError instanceof Error ? calcError.message : "Could not calculate purchasing power."
      );
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!parsedAmount || sourceCity === destCity || !rates) return;

    let cancelled = false;
    setLoading(true);
    setError("");

    (async () => {
      try {
        const [sourceCostUsd, destCostUsd] = await Promise.all([
          fetchCityMonthlyCost(sourceCity, householdSize),
          fetchCityMonthlyCost(destCity, householdSize),
        ]);
        if (cancelled) return;

        const amountUsd = convertAmount(parsedAmount, settings.displayCurrency, "USD", rates);
        const equivalentUsd = calculatePurchasingPowerEquivalent(
          amountUsd,
          sourceCostUsd,
          destCostUsd
        );
        setResult({ amountUsd, equivalentUsd, sourceCostUsd, destCostUsd });
      } catch (calcError) {
        if (cancelled) return;
        setError(
          calcError instanceof Error ? calcError.message : "Could not calculate purchasing power."
        );
        setResult(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sourceCity, destCity, parsedAmount, rates, settings.displayCurrency, householdSize]);

  const currency = settings.displayCurrency;
  const sourceName = sourceCity.split(",")[0];
  const destName = destCity.split(",")[0];
  const displayAmount = result
    ? formatUsd(result.amountUsd)
    : formatMoney(parsedAmount, currency);

  const displayMultiplier = result
    ? purchasingPowerMultiplier(result.sourceCostUsd, result.destCostUsd)
    : 0;

  return (
    <section className="card purchasing-power-panel">
      <div className="section-heading">
        <h3>Purchasing power calculator</h3>
        <p>
          Compare how far the same net income goes in two cities, including rent in both.
          Based on live and reference cost-of-living benchmarks.
        </p>
      </div>

      <div className="purchasing-power-controls">
        <label>
          Net income amount
          <div className="purchasing-power-amount-row">
            <span className="purchasing-power-currency">{currency}</span>
            <input
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="3000"
            />
          </div>
        </label>

        <label>
          In city
          <select value={sourceCity} onChange={(event) => setSourceCity(event.target.value)}>
            {REFERENCE_CITY_GROUPS.map((group) => (
              <optgroup key={group.label} label={group.label}>
                {group.cities.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>

        <label>
          Equivalent city
          <select value={destCity} onChange={(event) => setDestCity(event.target.value)}>
            {REFERENCE_CITY_GROUPS.map((group) => (
              <optgroup key={group.label} label={group.label}>
                {group.cities.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
      </div>

      <button className="tab active" onClick={handleCalculate} disabled={loading}>
        {loading ? "Calculating..." : "Calculate purchasing power"}
      </button>

      {error && <div className="error">{error}</div>}

      {result && (
        <div className="purchasing-power-result">
          <div className="purchasing-power-badge">
            <span className="purchasing-power-badge-label">Purchasing Power</span>
            <strong className="purchasing-power-badge-value">
              {displayMultiplier.toFixed(1)}×
            </strong>
            <span className="purchasing-power-badge-vs">in {sourceName} vs. {destName}</span>
          </div>
          <p className="purchasing-power-multiplier-note">
            Multiplier shows how much further the same income goes in {sourceName} compared with{" "}
            {destName}, based on monthly cost-of-living benchmarks (including rent).
          </p>
          <p className="purchasing-power-statement">
            <strong>{displayAmount}</strong> in <strong>{sourceCity}</strong> on average has the
            same local purchasing power as{" "}
            <strong className="purchasing-power-highlight">
              {formatUsd(result.equivalentUsd)}
            </strong>{" "}
            in <strong>{destCity}</strong> (assuming you pay rent in both cities). This comparison
            assumes net earnings (after income tax).
          </p>
          <div className="purchasing-power-meta">
            <span>
              {sourceName} index: {formatUsd(result.sourceCostUsd)}/mo
            </span>
            <span>
              {destName} index: {formatUsd(result.destCostUsd)}/mo
            </span>
            <span>
              Relative cost:{" "}
              {purchasingPowerRatio(result.sourceCostUsd, result.destCostUsd).toFixed(1)}%
            </span>
          </div>
        </div>
      )}
    </section>
  );
}
