"use client";

import Link from "next/link";
import { MouseEvent, ReactNode } from "react";
import { GetStartedSubSteps } from "@/components/GetStartedSubSteps";
import { TopTab, WizardStep } from "@/lib/wizard";

type Props = {
  topTab: TopTab;
  onTopTabChange: (tab: TopTab) => void;
  wizardStep: WizardStep;
  onSubStepClick: (step: WizardStep) => void;
  hasData: boolean;
  hasMultiplePeriods: boolean;
  uploadComplete: boolean;
  unknownTransactionCount: number;
  startTabComplete: boolean;
  onBrandClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
  children: ReactNode;
};

export function AppShell({
  topTab,
  onTopTabChange,
  wizardStep,
  onSubStepClick,
  hasData,
  hasMultiplePeriods,
  uploadComplete,
  unknownTransactionCount,
  startTabComplete,
  onBrandClick,
  children,
}: Props) {
  const startCountLabel = startTabComplete
    ? "✓"
    : String(hasMultiplePeriods ? 4 : 3);

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header-row">
          <div className="app-brand">
            <Link
              href="/"
              className="app-brand-mark-link"
              aria-label="Back to home"
              onClick={onBrandClick}
            >
              <div className="app-brand-mark" aria-hidden="true">
                B
              </div>
            </Link>
            <div className="app-brand-name">Balkans Relocation App</div>
          </div>
        </div>
      </header>

      <nav className="app-tabs" aria-label="Main sections">
        <button
          type="button"
          className={`app-tab-btn ${topTab === "start" ? "active" : ""} ${startTabComplete ? "done" : ""}`}
          onClick={() => onTopTabChange("start")}
        >
          Get started
          <span className="app-tab-count">{startCountLabel}</span>
        </button>
        <button
          type="button"
          className={`app-tab-btn ${topTab === "analyze" ? "active" : ""}`}
          onClick={() => hasData && onTopTabChange("analyze")}
          disabled={!hasData}
        >
          Health score
        </button>
        <button
          type="button"
          className={`app-tab-btn app-tab-relocate ${topTab === "relocate" ? "active" : ""}`}
          onClick={() => hasData && onTopTabChange("relocate")}
          disabled={!hasData}
        >
          Relocate
        </button>
      </nav>

      <div className="app-main shell">
        {topTab === "start" && (
          <GetStartedSubSteps
            currentStep={wizardStep}
            uploadComplete={uploadComplete}
            hasMultiplePeriods={hasMultiplePeriods}
            unknownTransactionCount={unknownTransactionCount}
            onStepClick={onSubStepClick}
          />
        )}
        {children}
      </div>
    </div>
  );
}
