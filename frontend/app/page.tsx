"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { FinancialHealthPanel, PeriodChangePanel } from "@/components/AdvisorView";
import { CurrencySettingsPanel } from "@/components/CurrencySettingsPanel";
import { CustomReportExport } from "@/components/CustomReportExport";
import { DashboardView } from "@/components/DashboardView";
import { HeroSection } from "@/components/HeroSection";
import { IncomeEntryPrompt } from "@/components/IncomeEntryPrompt";
import { MultiPeriodView } from "@/components/MultiPeriodView";
import { PeriodSelect } from "@/components/PeriodSelect";
import { RelocationExplorer } from "@/components/RelocationExplorer";
import { ReviewTab } from "@/components/ReviewTab";
import { CleanStepSummary } from "@/components/StepSummaries";
import { PeriodExclusionPanel } from "@/components/PeriodExclusionPanel";
import { SpendingAnalyticsPanel } from "@/components/SpendingAnalyticsPanel";
import { UploadZone } from "@/components/UploadZone";
import { WizardProgress } from "@/components/WizardProgress";
import { analyzeFilesInBrowser } from "@/lib/analyze-client";
import { SUPPORTED_REFERENCE_CITIES } from "@/lib/city-data";
import { analyzeTransactions } from "@/lib/analyzer";
import {
  AVERAGE_PERIOD_LABEL,
  analyzeAveragePeriods,
  analyzeCombinedPeriods,
} from "@/lib/rebuild";
import { resolvePeriodReportSelection } from "@/lib/rebuild";
import { findRelocatePeriod } from "@/lib/relocate-period";
import { countUnknownTransactions, hasUnknownTransactionsInData } from "@/lib/categorization";
import { useCurrency } from "@/lib/currency-context";
import { AnalyzeResponse } from "@/lib/types";
import { applyExcludedPeriods } from "@/lib/period-exclusion";
import { WizardStep } from "@/lib/wizard";

export default function HomePage() {
  const [data, setData] = useState<AnalyzeResponse | null>(null);
  const [excludedPeriods, setExcludedPeriods] = useState<string[]>([]);
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

  const analysisData = useMemo(() => {
    if (!data) return null;
    const validExcluded = excludedPeriods.filter((period) => data.periods.includes(period));
    return applyExcludedPeriods(data, validExcluded);
  }, [data, excludedPeriods]);

  useEffect(() => {
    if (!data) return;
    const activePeriods = analysisData?.periods ?? data.periods;
    const latest = activePeriods[activePeriods.length - 1];
    if (
      !locationPeriod ||
      (!activePeriods.includes(locationPeriod) && locationPeriod !== AVERAGE_PERIOD_LABEL)
    ) {
      setLocationPeriod(latest);
    }
    if (
      !selectedPeriod ||
      (!activePeriods.includes(selectedPeriod) &&
        selectedPeriod !== AVERAGE_PERIOD_LABEL &&
        selectedPeriod !== "All periods")
    ) {
      setSelectedPeriod(latest);
    }
  }, [data, analysisData, locationPeriod, selectedPeriod]);

  const singleAnalysis = useMemo(() => {
    if (!analysisData || isAllPeriods || isAveragePeriod) return null;
    const period = selectedPeriod || analysisData.periods[analysisData.periods.length - 1];
    const rows = analysisData.period_rows[period] ?? [];
    return analyzeTransactions(rows);
  }, [analysisData, selectedPeriod, isAllPeriods, isAveragePeriod]);

  const combinedAnalysis = useMemo(() => {
    if (!analysisData || !isAllPeriods) return null;
    return analyzeCombinedPeriods(analysisData.period_rows);
  }, [analysisData, isAllPeriods]);

  const averageAnalysis = useMemo(() => {
    if (!analysisData || !isAveragePeriod) return null;
    return analyzeAveragePeriods(analysisData.period_rows);
  }, [analysisData, isAveragePeriod]);

  const activeAnalysis = isAllPeriods
    ? combinedAnalysis
    : isAveragePeriod
      ? averageAnalysis
      : singleAnalysis;

  const activePeriodLabel = isAllPeriods
    ? "All periods"
    : isAveragePeriod
      ? "Average (all periods)"
      : selectedPeriod || analysisData?.periods[analysisData.periods.length - 1] || "";

  const dashboardHeading = isAllPeriods
    ? "Combined totals — all periods"
    : isAveragePeriod
      ? "Average per period — all periods"
      : `Period details — ${activePeriodLabel}`;

  const incomeEntryPeriodLabel =
    !isAllPeriods && !isAveragePeriod && selectedPeriod
      ? selectedPeriod
      : analysisData?.periods[analysisData.periods.length - 1] ?? "";

  const cleanIncomePeriodLabel = data?.periods[data.periods.length - 1] ?? "";
  const hasUnknownTransactions = data ? hasUnknownTransactionsInData(data) : false;
  const hasMultiplePeriods = Boolean(data && data.periods.length > 1);
  const unknownTransactionCount = data
    ? countUnknownTransactions(Object.values(data.period_rows).flat())
    : 0;

  const updateData = useCallback((next: AnalyzeResponse, savedPeriod?: string) => {
    setData(next);
    if (savedPeriod && next.periods.includes(savedPeriod)) {
      setSelectedPeriod(savedPeriod);
      setLocationPeriod(savedPeriod);
    }
  }, []);

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

  function resolveAnalyzeEntry() {
    if (!data) return;
    if (data.periods.length > 1) {
      setWizardStep("exclude-periods");
      return;
    }
    setWizardStep("analyze");
  }

  function goToStep(step: WizardStep) {
    if (!data && step !== "upload") return;
    if (step === "review") {
      if (!data || !hasUnknownTransactionsInData(data)) {
        resolveAnalyzeEntry();
        return;
      }
    }
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
            hasUnknownTransactions={hasUnknownTransactions}
            hasMultiplePeriods={hasMultiplePeriods}
            onStepClick={goToStep}
          />

          {wizardStep === "clean" && (
            <div className="stack">
              <CleanStepSummary data={data} />
              <IncomeEntryPrompt
                data={data}
                periodLabel={cleanIncomePeriodLabel}
                periods={data.periods}
                onUpdate={updateData}
                context="clean"
              />
              <ReviewTab data={data} onUpdate={updateData} showUnknownSection={false} />
              {hasUnknownTransactions ? (
                <section className="card clean-review-prompt">
                  <h3>Categorize unknown or uncategorized expenses?</h3>
                  <p>
                    You have <strong>{unknownTransactionCount}</strong> expense
                    {unknownTransactionCount === 1 ? "" : "s"} labeled Unknown or Uncategorized.
                    Assigning them to rent, groceries, and other categories improves your health
                    score, charts, and relocation reports.
                  </p>
                  <p className="clean-review-prompt-note">
                    Would you like to review and categorize these transactions before continuing?
                  </p>
                  <div className="wizard-nav">
                    <button className="tab" onClick={() => goToStep("upload")}>
                      Back
                    </button>
                    <button className="tab" onClick={resolveAnalyzeEntry}>
                      Skip for now
                    </button>
                    <button className="tab active" onClick={() => goToStep("review")}>
                      Review &amp; categorize
                    </button>
                  </div>
                </section>
              ) : (
                <div className="wizard-nav">
                  <button className="tab" onClick={() => goToStep("upload")}>
                    Back
                  </button>
                  <button className="tab active" onClick={resolveAnalyzeEntry}>
                    Continue to Analyze
                  </button>
                </div>
              )}
            </div>
          )}

          {wizardStep === "review" && (
            <div className="stack">
              <section className="card">
                <h3>Review unknown transactions</h3>
                <p>
                  Assign each unknown or uncategorized merchant to an expense category already used
                  in your file, or mark it as a transfer between your own accounts.
                </p>
              </section>
              <ReviewTab
                data={data}
                onUpdate={updateData}
                showUnknownSection
                showEditorSection={false}
              />
              <div className="wizard-nav">
                <button className="tab" onClick={() => goToStep("clean")}>
                  Back to Clean
                </button>
                <button className="tab active" onClick={resolveAnalyzeEntry}>
                  Continue to Analyze
                </button>
              </div>
            </div>
          )}

          {wizardStep === "exclude-periods" && data && (
            <PeriodExclusionPanel
              periods={data.periods}
              excludedPeriods={excludedPeriods}
              onExcludedChange={setExcludedPeriods}
              onBack={() => goToStep(hasUnknownTransactions ? "review" : "clean")}
              onContinue={() => goToStep("analyze")}
            />
          )}

          {wizardStep === "analyze" && analysisData && (
            <div className="stack">
              <CurrencySettingsPanel />

              {excludedPeriods.length > 0 ? (
                <section className="card period-exclusion-summary">
                  <p>
                    <strong>{excludedPeriods.length}</strong> period
                    {excludedPeriods.length === 1 ? "" : "s"} excluded from analysis:{" "}
                    {excludedPeriods.join(", ")}.{" "}
                    <button type="button" className="link-button" onClick={() => goToStep("exclude-periods")}>
                      Change
                    </button>
                  </p>
                </section>
              ) : null}

              <FinancialHealthPanel
                data={analysisData}
                selectedPeriod={selectedPeriod}
                onPeriodChange={setSelectedPeriod}
                insightsAnalysis={activeAnalysis}
              />
              <SpendingAnalyticsPanel
                data={analysisData}
                selectedPeriod={selectedPeriod}
                onPeriodChange={setSelectedPeriod}
              />

              {activeAnalysis && (
                <>
                  <div className="period-details-header">
                    <PeriodSelect
                      periods={analysisData.periods}
                      value={selectedPeriod}
                      onChange={setSelectedPeriod}
                    />
                    <h3 className="analyze-section-heading">{dashboardHeading}</h3>
                  </div>
                  <DashboardView
                    analysis={activeAnalysis}
                    showCharts
                    data={analysisData}
                    periodLabel={incomeEntryPeriodLabel}
                    periods={analysisData.periods}
                    selectedPeriod={selectedPeriod}
                    onPeriodChange={setSelectedPeriod}
                    onUpdate={updateData}
                  />
                </>
              )}
              <CustomReportExport
                periods={analysisData.periods}
                requirePeriodSelection
                availableTypes={["expenses-by-category", "financial-health"]}
                buildPayload={(selection) => {
                  const { periodLabel, periodAnalysis } = resolvePeriodReportSelection(
                    analysisData.period_rows,
                    analysisData.periods,
                    selection
                  );
                  return {
                    generatedAt: new Date().toLocaleString(),
                    periodLabel,
                    periodSelection: selection,
                    displayCurrency: settings.displayCurrency,
                    data: analysisData,
                    periodAnalysis,
                    recommendations: [],
                    formatIncome,
                    formatExpense,
                  };
                }}
              />
              <PeriodChangePanel data={analysisData} />              {analysisData.periods.length > 1 && <MultiPeriodView data={analysisData} />}
              <div className="wizard-nav">
                <button className="tab" onClick={() => goToStep(hasUnknownTransactions ? "review" : "clean")}>
                  Back
                </button>
                <button className="tab active" onClick={() => goToStep("relocate")}>
                  Continue to Relocate
                </button>
              </div>
            </div>
          )}

          {wizardStep === "relocate" && analysisData && (
            <div className="stack">
              <RelocationExplorer
                data={analysisData}
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
