"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { FinancialHealthPanel, PeriodChangePanel } from "@/components/AdvisorView";
import { CurrencySettingsPanel } from "@/components/CurrencySettingsPanel";
import { CustomReportExport } from "@/components/CustomReportExport";
import { DashboardView, InsightsPanel } from "@/components/DashboardView";
import { HeroSection } from "@/components/HeroSection";
import { IncomeEntryPrompt } from "@/components/IncomeEntryPrompt";
import { MultiPeriodView } from "@/components/MultiPeriodView";
import { RelocationExplorer } from "@/components/RelocationExplorer";
import { ReviewTab } from "@/components/ReviewTab";
import { AnalyzeStepSummary, CleanStepSummary } from "@/components/StepSummaries";
import { UploadZone } from "@/components/UploadZone";
import { WizardProgress } from "@/components/WizardProgress";
import { analyzeFilesInBrowser } from "@/lib/analyze-client";
import { SUPPORTED_REFERENCE_CITIES } from "@/lib/city-data";
import {
  AVERAGE_PERIOD_LABEL,
  analyzeAveragePeriods,
  analyzeCombinedPeriods,
} from "@/lib/rebuild";
import { findRelocatePeriod } from "@/lib/relocate-period";
import { useCurrency } from "@/lib/currency-context";
import { AnalyzeResponse } from "@/lib/types";
import { WizardStep } from "@/lib/wizard";
export default function HomePage() {
  const [data, setData] = useState<AnalyzeResponse | null>(null);
  const [wizardStep, setWizardStep] = useState<WizardStep>("upload");
  const [selectedPeriod, setSelectedPeriod] = useState<string>("");
  const [locationPeriod, setLocationPeriod] = useState<string>("");
  const [baseCity, setBaseCity] = useState<string>(SUPPORTED_REFERENCE_CITIES[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [, startTransition] = useTransition();
  const { formatIncome, formatExpense, settings } = useCurrency();
  const isAllPeriods = selectedPeriod === "All periods";
  const isAveragePeriod = selectedPeriod === AVERAGE_PERIOD_LABEL;

  useEffect(() => {
    if (!data) return;
    const latest = data.periods[data.periods.length - 1];
    if (
      !locationPeriod ||
      (!data.periods.includes(locationPeriod) && locationPeriod !== AVERAGE_PERIOD_LABEL)
    ) {
      setLocationPeriod(latest);
    }
    if (
      !selectedPeriod ||
      (!data.periods.includes(selectedPeriod) &&
        selectedPeriod !== AVERAGE_PERIOD_LABEL &&
        selectedPeriod !== "All periods")
    ) {
      setSelectedPeriod(latest);
    }
  }, [data, locationPeriod, selectedPeriod]);

  const singleAnalysis = useMemo(() => {
    if (!data || isAllPeriods || isAveragePeriod) return null;
    const period = selectedPeriod || data.periods[data.periods.length - 1];
    return data.period_analysis[period] ?? null;
  }, [data, selectedPeriod, isAllPeriods, isAveragePeriod]);

  const combinedAnalysis = useMemo(() => {
    if (!data || !isAllPeriods) return null;
    return analyzeCombinedPeriods(data.period_rows);
  }, [data, isAllPeriods]);

  const averageAnalysis = useMemo(() => {
    if (!data || !isAveragePeriod) return null;
    return analyzeAveragePeriods(data.period_rows);
  }, [data, isAveragePeriod]);

  const activeAnalysis = isAllPeriods
    ? combinedAnalysis
    : isAveragePeriod
      ? averageAnalysis
      : singleAnalysis;

  const activePeriodLabel = isAllPeriods
    ? "All periods"
    : isAveragePeriod
      ? "Average (all periods)"
      : selectedPeriod || data?.periods[data.periods.length - 1] || "";

  const dashboardHeading = isAllPeriods
    ? "Combined totals — all periods"
    : isAveragePeriod
      ? "Average per period — all periods"
      : `Period details — ${activePeriodLabel}`;

  const incomeEntryPeriodLabel =
    !isAllPeriods && !isAveragePeriod && selectedPeriod
      ? selectedPeriod
      : data?.periods[data.periods.length - 1] ?? "";

  const cleanIncomePeriodLabel = data?.periods[data.periods.length - 1] ?? "";

  const updateData = useCallback(
    (next: AnalyzeResponse) => {
      setData(next);
      setLocationPeriod((current) => findRelocatePeriod(next, current));
    },
    []
  );

  async function handleUpload(files: File[]) {    setLoading(true);
    setError("");
    try {
      const result = await analyzeFilesInBrowser(files);
      startTransition(() => {
        setData(result);
        const latest = result.periods[result.periods.length - 1];
        setSelectedPeriod(latest);
        setLocationPeriod(latest);
        setWizardStep("clean");
      });
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Upload failed.");
    } finally {
      setLoading(false);
    }
  }

  function goToStep(step: WizardStep) {
    if (!data && step !== "upload") return;
    if (step === "relocate" && data) {
      const relocatePeriod =
        !isAllPeriods && !isAveragePeriod && selectedPeriod
          ? selectedPeriod
          : findRelocatePeriod(data, locationPeriod);
      setLocationPeriod(relocatePeriod);
    }
    setWizardStep(step);
  }
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [wizardStep]);

  return (
    <main>
      <div className="home-landing">
        <HeroSection showFeatures={wizardStep === "upload" || !data} />

        {(wizardStep === "upload" || !data) && (
          <UploadZone onUpload={handleUpload} loading={loading} onError={setError} />
        )}
      </div>

      {error && <div className="error">{error}</div>}

      {data && (
        <>
          <div className="success">{data.privacy_notice}</div>

          <WizardProgress
            currentStep={wizardStep}
            uploadComplete={Boolean(data)}
            onStepClick={goToStep}
          />

          {wizardStep === "clean" && (
            <div className="stack">
              <CleanStepSummary data={data} />
              <IncomeEntryPrompt
                data={data}
                periodLabel={cleanIncomePeriodLabel}
                onUpdate={updateData}
                context="clean"
              />
              <ReviewTab data={data} onUpdate={updateData} />              <div className="wizard-nav">
                <button className="tab" onClick={() => goToStep("upload")}>
                  Back
                </button>
                <button className="tab active" onClick={() => goToStep("analyze")}>
                  Continue to Analyze
                </button>
              </div>
            </div>
          )}

          {wizardStep === "analyze" && (
            <div className="stack">
              <CurrencySettingsPanel />
              <FinancialHealthPanel data={data} />

              <section className="card analyze-period-bar">
                <label className="analyze-period-label">
                  Period
                  <select
                    value={selectedPeriod}
                    onChange={(event) => setSelectedPeriod(event.target.value)}
                  >
                    {data.periods.map((period) => (
                      <option key={period} value={period}>
                        {period}
                      </option>
                    ))}
                    {data.periods.length > 1 && (
                      <>
                        <option value="All periods">All periods</option>
                        <option value={AVERAGE_PERIOD_LABEL}>Average (all periods)</option>
                      </>
                    )}
                  </select>
                </label>
              </section>

              {activeAnalysis && (
                <>
                  <AnalyzeStepSummary analysis={activeAnalysis} periodLabel={activePeriodLabel} />
                  <InsightsPanel analysis={activeAnalysis} />
                  <h3 className="analyze-section-heading">{dashboardHeading}</h3>
                  <DashboardView
                    analysis={activeAnalysis}
                    showCharts
                    data={data}
                    periodLabel={incomeEntryPeriodLabel}
                    onUpdate={updateData}
                  />
                </>
              )}
              <CustomReportExport                periods={data.periods}
                requirePeriodSelection
                availableTypes={["expenses-by-category", "financial-health"]}
                buildPayload={(periodLabel) => {
                  const analysis = data.period_analysis[periodLabel];
                  if (!analysis) {
                    throw new Error(`No analysis found for period ${periodLabel}.`);
                  }
                  return {
                    generatedAt: new Date().toLocaleString(),
                    periodLabel,
                    displayCurrency: settings.displayCurrency,
                    data,
                    periodAnalysis: analysis,
                    recommendations: [],
                    formatIncome,
                    formatExpense,
                  };
                }}
              />
              <PeriodChangePanel data={data} />              {data.periods.length > 1 && <MultiPeriodView data={data} />}
              <div className="wizard-nav">
                <button className="tab" onClick={() => goToStep("clean")}>
                  Back
                </button>
                <button className="tab active" onClick={() => goToStep("relocate")}>
                  Continue to Relocate
                </button>
              </div>
            </div>
          )}

          {wizardStep === "relocate" && (
            <div className="stack">
              <RelocationExplorer
                data={data}
                baseCity={baseCity}
                onBaseCityChange={setBaseCity}
                locationPeriod={locationPeriod}
                onLocationPeriodChange={setLocationPeriod}
                onError={setError}
              />
              <div className="wizard-nav">
                <button className="tab" onClick={() => goToStep("analyze")}>
                  Back
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </main>
  );
}
