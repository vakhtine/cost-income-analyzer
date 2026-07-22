export type WizardStep = "upload" | "clean" | "analyze" | "relocate";

export const WIZARD_STEPS: { id: WizardStep; label: string; description: string }[] = [
  { id: "upload", label: "Upload", description: "Add your CSV or Excel statements" },
  { id: "clean", label: "Clean", description: "Fix categories & unknowns" },
  { id: "analyze", label: "Analyze", description: "Understand your cash flow" },
  { id: "relocate", label: "Relocate", description: "Can you afford to move?" },
];

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
