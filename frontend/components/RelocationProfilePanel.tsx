"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchCityMonthlyCost } from "@/lib/city-data";
import { REFERENCE_CITY_GROUPS } from "@/lib/constants";
import { useCurrency } from "@/lib/currency-context";
import {
  calculateCityRelocationReadiness,
  loadRelocationProfile,
  RelocationProfile,
  RelocationTimeline,
  saveRelocationProfile,
} from "@/lib/relocation-profile";
import { PeriodAnalysis } from "@/lib/types";

const TIMELINE_OPTIONS: { id: RelocationTimeline; label: string }[] = [
  { id: "exploring", label: "Just exploring" },
  { id: "3months", label: "Within 3 months" },
  { id: "6months", label: "Within 6 months" },
];

type Props = {
  analysis: PeriodAnalysis;
  defaultCity?: string;
  householdSize?: number;
};

export function RelocationProfilePanel({
  analysis,
  defaultCity = "",
  householdSize = 1,
}: Props) {
  const { convertIncome, convertReferenceCost, formatDisplay } = useCurrency();
  const [profile, setProfile] = useState<RelocationProfile>(() => {
    const loaded = loadRelocationProfile();
    return {
      ...loaded,
      targetCity: loaded.targetCity ?? defaultCity ?? null,
    };
  });
  const [savedNotice, setSavedNotice] = useState("");
  const [destinationCostDisplay, setDestinationCostDisplay] = useState(0);
  const [loadingCity, setLoadingCity] = useState(false);
  const [cityError, setCityError] = useState("");

  const targetCity = profile.targetCity ?? defaultCity;

  useEffect(() => {
    saveRelocationProfile(profile);
  }, [profile]);

  useEffect(() => {
    if (!targetCity) {
      setDestinationCostDisplay(0);
      return;
    }

    let cancelled = false;
    setLoadingCity(true);
    setCityError("");

    fetchCityMonthlyCost(targetCity, householdSize)
      .then((costUsd) => {
        if (cancelled) return;
        setDestinationCostDisplay(convertReferenceCost(costUsd));
      })
      .catch((error) => {
        if (cancelled) return;
        setDestinationCostDisplay(0);
        setCityError(
          error instanceof Error ? error.message : "Could not load city costs."
        );
      })
      .finally(() => {
        if (!cancelled) setLoadingCity(false);
      });

    return () => {
      cancelled = true;
    };
  }, [targetCity, householdSize, convertReferenceCost]);

  const incomeDisplay = useMemo(
    () => convertIncome(analysis.total_income),
    [analysis.total_income, convertIncome]
  );

  const readiness = useMemo(
    () =>
      calculateCityRelocationReadiness(
        incomeDisplay,
        profile.savingsBalance,
        destinationCostDisplay,
        targetCity || "selected city"
      ),
    [incomeDisplay, profile.savingsBalance, destinationCostDisplay, targetCity]
  );

  function updateSavings(value: string) {
    const parsed = value.trim() === "" ? null : Number(value);
    setProfile((current) => ({
      ...current,
      savingsBalance: parsed !== null && Number.isFinite(parsed) ? Math.max(0, parsed) : null,
    }));
    setSavedNotice("");
  }

  function updateTimeline(timeline: RelocationTimeline | "") {
    setProfile((current) => ({
      ...current,
      timeline: timeline || null,
    }));
    setSavedNotice("Profile saved for this session.");
    window.setTimeout(() => setSavedNotice(""), 4000);
  }

  function updateTargetCity(city: string) {
    setProfile((current) => ({
      ...current,
      targetCity: city || null,
    }));
    setSavedNotice("");
  }

  return (
    <section className="card relocation-profile-panel">
      <div className="section-heading">
        <h3>Your relocation profile</h3>
        <p>
          Choose a destination city and optional savings. Runway, move readiness, and income
          coverage are calculated from that city&apos;s estimated monthly costs and your uploaded
          income — stored only in this browser session.
        </p>
      </div>

      <div className="profile-input-grid">
        <label>
          Destination city
          <select value={targetCity} onChange={(event) => updateTargetCity(event.target.value)}>
            {!targetCity && <option value="">Select a city</option>}
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
          Total savings (optional)
          <input
            type="number"
            min={0}
            step={100}
            placeholder="e.g. 12000"
            value={profile.savingsBalance ?? ""}
            onChange={(event) => updateSavings(event.target.value)}
          />
        </label>
        <label>
          Relocation timeline
          <select
            value={profile.timeline ?? ""}
            onChange={(event) => updateTimeline(event.target.value as RelocationTimeline | "")}
          >
            <option value="">Not set</option>
            {TIMELINE_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {loadingCity && <p className="section-note">Loading {targetCity} cost estimates…</p>}
      {cityError && <div className="error">{cityError}</div>}
      {savedNotice && <div className="save-notice inline">{savedNotice}</div>}

      <div className="readiness-grid">
        <article className="readiness-card">
          <span className="readiness-label">Runway</span>
          <strong className="readiness-value">
            {readiness.runwayMonths !== null
              ? `${readiness.runwayMonths.toFixed(1)} months`
              : "—"}
          </strong>
          <p>{readiness.runwayLabel}</p>
        </article>
        <article className="readiness-card">
          <span className="readiness-label">Move readiness</span>
          <strong className="readiness-value">
            {destinationCostDisplay > 0 && incomeDisplay > 0
              ? `${readiness.moveReadinessPct.toFixed(0)}% buffer`
              : "—"}
          </strong>
          <p>{readiness.moveReadinessLabel}</p>
        </article>
        <article className="readiness-card">
          <span className="readiness-label">Income coverage</span>
          <strong className="readiness-value">
            {incomeDisplay > 0 && destinationCostDisplay > 0
              ? `${Math.max(0, 100 - readiness.incomeCoveragePct).toFixed(0)}% free`
              : "—"}
          </strong>
          <p>{readiness.incomeCoverageLabel}</p>
        </article>
        <article className="readiness-card">
          <span className="readiness-label">Savings entered</span>
          <strong className="readiness-value">
            {profile.savingsBalance && profile.savingsBalance > 0
              ? formatDisplay(profile.savingsBalance)
              : "—"}
          </strong>
          <p>
            {profile.savingsBalance && profile.savingsBalance > 0
              ? "Used only to estimate runway — not sent anywhere."
              : "Optional — enter savings above to calculate runway."}
          </p>
        </article>
      </div>
    </section>
  );
}
