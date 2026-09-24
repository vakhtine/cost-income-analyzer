"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { AppShell } from "@/components/AppShell";
import { AnalyzeEditPrompt } from "@/components/AnalyzeEditPrompt";
import {
  FinancialHealthPanel,
  HealthMethodologyPanel,
} from "@/components/AdvisorView";
import { CurrencySettingsPanel } from "@/components/CurrencySettingsPanel";
import { CustomReportExport } from "@/components/CustomReportExport";
import { CategoryChartsPanel, InsightsPanel } from "@/components/DashboardView";
import { IncomeEntryPrompt } from "@/components/IncomeEntryPrompt";
import { MortgageEntryPrompt } from "@/components/MortgageEntryPrompt";
import { MultiPeriodView } from "@/components/MultiPeriodView";
import { RelocationExplorer } from "@/components/RelocationExplorer";
import { ReviewTab } from "@/components/ReviewTab";
import { CleanStepSummary } from "@/components/StepSummaries";
import { PeriodExclusionPanel } from "@/components/PeriodExclusionPanel";
import { SpendingAnalyticsPanel } from "@/components/SpendingAnalyticsPanel";
import { UploadZone } from "@/components/UploadZone";
import { analyzeFilesInBrowser } from "@/lib/analyze-client";
import { SUPPORTED_REFERENCE_CITIES } from "@/lib/city-data";
import { analyzeTransactions } from "@/lib/analyzer";
import {
  AVERAGE_PERIOD_LABEL,
  analyzeAveragePeriods,
  analyzeCombinedPeriods,
  resolvePeriodReportSelection,
} from "@/lib/rebuild";
import { findRelocatePeriod } from "@/lib/relocate-period";
import { countUnknownTransactions } from "@/lib/categorization";
import { useCurrency } from "@/lib/currency-context";
import { AnalyzeResponse } from "@/lib/types";
import { applyExcludedPeriods } from "@/lib/period-exclusion";
import { TopTab, wizardStepToTopTab, WizardStep } from "@/lib/wizard";

export default function HomePage() {
  const [data, setData] = useState<AnalyzeResponse | null>(null);
  const [excludedPeriods, setExcludedPeriods] = useState<string[]>([]);
  const [wizardStep, setWizardStep] = useState<WizardStep>("upload");
  const [selectedPeriod, setSelectedPeriod] = useState<string>("");
  const [locationPeriod, setLocationPeriod] = useState<string>("");
  const [baseCity, setBaseCity] = useState<string>(SUPPORTED_REFERENCE_CITIES[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showAnalyzeEditPrompt, setShowAnalyzeEditPrompt] = useState(true);
  const [, startTransition] = useTransition();
  const { formatIncome, formatExpense, settings } = useCurrency();
  const isAllPeriods = selectedPeriod === "All periods";
  const isAveragePeriod = selectedPeriod === AVERAGE_PERIOD_LABEL;

  const topTab = wizardStepToTopTab(wizardStep);
  const hasMultiplePeriods = Boolean(data && data.periods.length > 1);
  const startTabComplete = wizardStep === "analyze" || wizardStep === "relocate";

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

  const incomeEntryPeriodLabel =
    !isAllPeriods && !isAveragePeriod && selectedPeriod
      ? selectedPeriod
      : analysisData?.periods[analysisData.periods.length - 1] ?? "";

  const cleanIncomePeriodLabel = data?.periods[data.periods.length - 1] ?? "";
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

  async function handleUpload(files: File[]) {
    setLoading(true);
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
    if (step === "analyze") {
      setShowAnalyzeEditPrompt(true);
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

  function handleTopTabChange(tab: TopTab) {
    if (!data && tab !== "start") return;
    if (tab === "start") {
      if (wizardStep === "analyze" || wizardStep === "relocate") {
        goToStep(hasMultiplePeriods ? "exclude-periods" : "review");
      }
      return;
    }
    if (tab === "analyze") {
      goToStep("analyze");
      return;
    }
    goToStep("relocate");
  }

  function handleBrandClick(event: React.MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    setData(null);
    setExcludedPeriods([]);
    setLoading(false);
    setError("");
    setShowAnalyzeEditPrompt(true);
    setWizardStep("upload");
    window.scrollTo(0, 0);
  }

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [wizardStep]);

  return (
    <AppShell
      topTab={topTab}
      onTopTabChange={handleTopTabChange}
      wizardStep={wizardStep}
      onSubStepClick={goToStep}
      hasData={Boolean(data)}
      hasMultiplePeriods={hasMultiplePeriods}
      uploadComplete={Boolean(data)}
      unknownTransactionCount={unknownTransactionCount}
      startTabComplete={startTabComplete}
      onBrandClick={handleBrandClick}
    >
      {error && !((!data || wizardStep === "upload") && topTab === "start") ? (
        <div className="error">{error}</div>
      ) : null}

      {(!data || wizardStep === "upload") && topTab === "start" ? (
        <UploadZone
          onUpload={handleUpload}
          loading={loading}
          error={error}
          onError={setError}
        />
      ) : null}

      {data && wizardStep === "clean" && topTab === "start" ? (
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
          <div className="wizard-nav">
            <button type="button" className="tab" onClick={() => goToStep("upload")}>
              ← Back
            </button>
            <button type="button" className="tab active" onClick={() => goToStep("review")}>
              Continue →
            </button>
          </div>
        </div>
      ) : null}

      {data && wizardStep === "review" && topTab === "start" ? (
        <div className="stack">
          <section className="card">
            <p className="eyebrow">Review · {cleanIncomePeriodLabel}</p>
            <h2>Categorize unknowns &amp; add missing expenses</h2>
            <p className="plain">
              {unknownTransactionCount > 0
                ? `${unknownTransactionCount} item${unknownTransactionCount === 1 ? "" : "s"} need a decision before your health score can be calculated.`
                : "No unknown merchants found — you can still add mortgage payments or continue."}
            </p>
          </section>
          <section className="grid-2 review-entry-prompts">
            <IncomeEntryPrompt
              data={data}
              periodLabel={cleanIncomePeriodLabel}
              periods={data.periods}
              onUpdate={updateData}
              context="clean"
            />
            <MortgageEntryPrompt
              data={data}
              periodLabel={cleanIncomePeriodLabel}
              periods={data.periods}
              onUpdate={updateData}
            />
          </section>
          <ReviewTab
            data={data}
            onUpdate={updateData}
            showUnknownSection
            showEditorSection={false}
          />
          <div className="wizard-nav">
            <button type="button" className="tab" onClick={() => goToStep("clean")}>
              ← Back
            </button>
            <button type="button" className="tab active" onClick={resolveAnalyzeEntry}>
              Continue →
            </button>
          </div>
        </div>
      ) : null}

      {data && wizardStep === "exclude-periods" && topTab === "start" ? (
        <PeriodExclusionPanel
          periods={data.periods}
          excludedPeriods={excludedPeriods}
          onExcludedChange={setExcludedPeriods}
          onBack={() => goToStep("review")}
          onContinue={() => goToStep("analyze")}
        />
      ) : null}

      {wizardStep === "analyze" && analysisData && topTab === "analyze" ? (
        <div className="stack app-tab-content">
          <CurrencySettingsPanel />

          {showAnalyzeEditPrompt ? (
            <AnalyzeEditPrompt
              onEdit={() => goToStep("clean")}
              onContinue={() => setShowAnalyzeEditPrompt(false)}
            />
          ) : null}

          <div className="stack analyze-tab-stack">
            {activeAnalysis ? (
              <CategoryChartsPanel
                analysis={activeAnalysis}
                data={analysisData}
                periodLabel={incomeEntryPeriodLabel}
                periods={analysisData.periods}
                onUpdate={updateData}
              />
            ) : null}

            <FinancialHealthPanel
              data={analysisData}
              selectedPeriod={selectedPeriod}
              onPeriodChange={setSelectedPeriod}
            />

            <HealthMethodologyPanel />

            <SpendingAnalyticsPanel
              data={analysisData}
              selectedPeriod={selectedPeriod}
              onPeriodChange={setSelectedPeriod}
            />

            {activeAnalysis ? <InsightsPanel analysis={activeAnalysis} /> : null}
          </div>

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
          {analysisData.periods.length > 1 ? <MultiPeriodView data={analysisData} /> : null}
          <div className="wizard-nav">
            <button type="button" className="tab" onClick={() => goToStep("review")}>
              ← Back to Get started
            </button>
            <button type="button" className="tab active" onClick={() => goToStep("relocate")}>
              Continue to Relocate →
            </button>
          </div>
        </div>
      ) : null}

      {wizardStep === "relocate" && analysisData && topTab === "relocate" ? (
        <div className="stack app-tab-content">
          <RelocationExplorer
            data={analysisData}
            baseCity={baseCity}
            onBaseCityChange={setBaseCity}
            locationPeriod={locationPeriod}
            onLocationPeriodChange={setLocationPeriod}
            onError={setError}
          />
          <div className="wizard-nav">
            <button type="button" className="tab" onClick={() => goToStep("analyze")}>
              ← Back
            </button>
          </div>
        </div>
      ) : null}

      {data ? <div className="privacy-strip">{data.privacy_notice}</div> : null}
    </AppShell>
  );
}
