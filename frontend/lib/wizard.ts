export type WizardStep =
  | "upload"
  | "clean"
  | "review"
  | "exclude-periods"
  | "analyze"
  | "relocate";

export const WIZARD_STEPS: { id: WizardStep; label: string; description: string }[] = [
  { id: "upload", label: "Upload", description: "Add your CSV or spreadsheet statements" },
  { id: "clean", label: "Clean", description: "Fix categories & transfers" },
  { id: "review", label: "Review unknown", description: "Categorize unknown merchants" },
  {
    id: "exclude-periods",
    label: "Exclude periods",
    description: "Omit incomplete or unusual months",
  },
  { id: "analyze", label: "Analyze", description: "Understand your cash flow" },
  { id: "relocate", label: "Relocate", description: "Can you afford to move?" },
];

export function visibleWizardSteps(
  hasUnknownTransactions: boolean,
  hasMultiplePeriods: boolean
) {
  let steps = hasUnknownTransactions
    ? WIZARD_STEPS
    : WIZARD_STEPS.filter((step) => step.id !== "review");
  if (!hasMultiplePeriods) {
    steps = steps.filter((step) => step.id !== "exclude-periods");
  }
  return steps;
}

export type LifestyleLevel = "budget" | "average" | "comfortable";

export const LIFESTYLE_OPTIONS: {
  id: LifestyleLevel;
  label: string;
  description: string;
  multiplier: number;
}[] = [
  {
    id: "budget",
    label: "Budget",
    description: "Lean lifestyle — shared housing, cook at home",
    multiplier: 0.85,
  },
  {
    id: "average",
    label: "Average",
    description: "Typical local spending patterns",
    multiplier: 1,
  },
  {
    id: "comfortable",
    label: "Comfortable",
    description: "More dining out, central rent, leisure",
    multiplier: 1.25,
  },
];

export function lifestyleMultiplier(level: LifestyleLevel) {
  return LIFESTYLE_OPTIONS.find((option) => option.id === level)?.multiplier ?? 1;
}
