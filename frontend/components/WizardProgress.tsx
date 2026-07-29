"use client";

import { visibleWizardSteps, WizardStep } from "@/lib/wizard";

type Props = {
  currentStep: WizardStep;
  uploadComplete: boolean;
  hasMultiplePeriods: boolean;
  unknownTransactionCount?: number;
  onStepClick: (step: WizardStep) => void;
};

export function WizardProgress({
  currentStep,
  uploadComplete,
  hasMultiplePeriods,
  unknownTransactionCount = 0,
  onStepClick,
}: Props) {
  const steps = visibleWizardSteps(hasMultiplePeriods);
  const currentIndex = steps.findIndex((step) => step.id === currentStep);

  return (
    <nav className="wizard-progress" aria-label="Analysis progress">
      {steps.map((step, index) => {
        const isComplete =
          index < currentIndex || (step.id === "upload" && uploadComplete);
        const isActive = step.id === currentStep;
        const isClickable = uploadComplete || step.id === "upload";

        return (
          <button
            key={step.id}
            type="button"
            className={`wizard-step ${isActive ? "active" : ""} ${isComplete ? "complete" : ""}`}
            onClick={() => isClickable && onStepClick(step.id)}
            disabled={!isClickable}
          >
            <span className="wizard-step-number">{isComplete && !isActive ? "✓" : index + 1}</span>
            <span className="wizard-step-copy">
              <span className="wizard-step-label">
                {step.label}
                {step.id === "review" && unknownTransactionCount > 0
                  ? ` (${unknownTransactionCount})`
                  : ""}
              </span>
              <span className="wizard-step-desc">{step.description}</span>
            </span>
          </button>
        );
      })}
    </nav>
  );
}
