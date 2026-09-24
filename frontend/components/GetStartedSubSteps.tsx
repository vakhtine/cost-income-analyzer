"use client";

import { getStartSubSteps, WizardStep } from "@/lib/wizard";

type Props = {
  currentStep: WizardStep;
  uploadComplete: boolean;
  hasMultiplePeriods: boolean;
  unknownTransactionCount?: number;
  onStepClick: (step: WizardStep) => void;
};

export function GetStartedSubSteps({
  currentStep,
  uploadComplete,
  hasMultiplePeriods,
  unknownTransactionCount = 0,
  onStepClick,
}: Props) {
  const steps = getStartSubSteps(hasMultiplePeriods);
  const currentIndex = steps.findIndex((step) => step.id === currentStep);
  const inStartFlow = currentIndex >= 0;

  return (
    <nav
      className={`substeps ${steps.length === 3 ? "substeps-3" : ""}`}
      aria-label="Get started steps"
    >
      {steps.map((step, index) => {
        const isActive = inStartFlow && step.id === currentStep;
        const isDone =
          uploadComplete && (!inStartFlow || index < currentIndex || (step.id === "upload" && !isActive));
        const isPending = !uploadComplete
          ? step.id !== "upload"
          : inStartFlow && index > currentIndex;
        const isClickable = uploadComplete || step.id === "upload";

        let badge: string;
        if (isDone && !isActive) {
          badge = "✓";
        } else if (step.id === "review" && unknownTransactionCount > 0 && !isDone) {
          badge = String(unknownTransactionCount);
        } else {
          badge = String(index + 1);
        }

        return (
          <button
            key={step.id}
            type="button"
            className={`subchip ${isActive ? "active" : ""} ${isDone ? "done" : ""} ${isPending ? "pending" : ""}`}
            onClick={() => isClickable && !isPending && onStepClick(step.id)}
            disabled={!isClickable || isPending}
          >
            <div className="subchip-top">
              <span className="subchip-title">{step.label}</span>
              <span className="subchip-badge">{badge}</span>
            </div>
            <div className="subchip-desc">
              {step.id === "review" && unknownTransactionCount > 0 && !isDone ? (
                <>
                  <span className="subchip-flag">{unknownTransactionCount} need review</span>
                  {" · "}
                  {step.description}
                </>
              ) : (
                step.description
              )}
            </div>
          </button>
        );
      })}
    </nav>
  );
}
