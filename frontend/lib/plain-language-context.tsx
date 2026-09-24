"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

type HealthScoreUiContextValue = {
  showHealthScoreDetails: boolean;
  setShowHealthScoreDetails: (value: boolean) => void;
  toggleHealthScoreDetails: () => void;
  showMetricsDetails: boolean;
  setShowMetricsDetails: (value: boolean) => void;
  toggleMetricsDetails: () => void;
  showMethodologyDetails: boolean;
  setShowMethodologyDetails: (value: boolean) => void;
  toggleMethodologyDetails: () => void;
  showCompositeDetails: boolean;
  setShowCompositeDetails: (value: boolean) => void;
  toggleCompositeDetails: () => void;
  showPurchasingPowerDetails: boolean;
  setShowPurchasingPowerDetails: (value: boolean) => void;
  togglePurchasingPowerDetails: () => void;
};

const HealthScoreUiContext = createContext<HealthScoreUiContextValue | null>(null);

export function PlainLanguageProvider({ children }: { children: ReactNode }) {
  const [showHealthScoreDetails, setShowHealthScoreDetails] = useState(false);
  const [showMetricsDetails, setShowMetricsDetails] = useState(false);
  const [showMethodologyDetails, setShowMethodologyDetails] = useState(false);
  const [showCompositeDetails, setShowCompositeDetails] = useState(false);
  const [showPurchasingPowerDetails, setShowPurchasingPowerDetails] = useState(false);

  const value = useMemo(
    () => ({
      showHealthScoreDetails,
      setShowHealthScoreDetails,
      toggleHealthScoreDetails: () => setShowHealthScoreDetails((current) => !current),
      showMetricsDetails,
      setShowMetricsDetails,
      toggleMetricsDetails: () => setShowMetricsDetails((current) => !current),
      showMethodologyDetails,
      setShowMethodologyDetails,
      toggleMethodologyDetails: () => setShowMethodologyDetails((current) => !current),
      showCompositeDetails,
      setShowCompositeDetails,
      toggleCompositeDetails: () => setShowCompositeDetails((current) => !current),
      showPurchasingPowerDetails,
      setShowPurchasingPowerDetails,
      togglePurchasingPowerDetails: () =>
        setShowPurchasingPowerDetails((current) => !current),
    }),
    [
      showHealthScoreDetails,
      showMetricsDetails,
      showMethodologyDetails,
      showCompositeDetails,
      showPurchasingPowerDetails,
    ]
  );

  return <HealthScoreUiContext.Provider value={value}>{children}</HealthScoreUiContext.Provider>;
}

function useHealthScoreUiContext() {
  const context = useContext(HealthScoreUiContext);
  if (!context) {
    throw new Error("Health score UI hooks must be used within PlainLanguageProvider");
  }
  return context;
}

export function useHealthScoreDetails() {
  const {
    showHealthScoreDetails,
    setShowHealthScoreDetails,
    toggleHealthScoreDetails,
  } = useHealthScoreUiContext();

  return {
    showDetails: showHealthScoreDetails,
    setShowDetails: setShowHealthScoreDetails,
    toggleDetails: toggleHealthScoreDetails,
  };
}

export function useMetricsDetails() {
  const { showMetricsDetails, setShowMetricsDetails, toggleMetricsDetails } =
    useHealthScoreUiContext();

  return {
    showDetails: showMetricsDetails,
    setShowDetails: setShowMetricsDetails,
    toggleDetails: toggleMetricsDetails,
  };
}

export function useMethodologyDetails() {
  const {
    showMethodologyDetails,
    setShowMethodologyDetails,
    toggleMethodologyDetails,
  } = useHealthScoreUiContext();

  return {
    showDetails: showMethodologyDetails,
    setShowDetails: setShowMethodologyDetails,
    toggleDetails: toggleMethodologyDetails,
  };
}

export function useCompositeDetails() {
  const { showCompositeDetails, setShowCompositeDetails, toggleCompositeDetails } =
    useHealthScoreUiContext();

  return {
    showDetails: showCompositeDetails,
    setShowDetails: setShowCompositeDetails,
    toggleDetails: toggleCompositeDetails,
  };
}

export function usePurchasingPowerDetails() {
  const {
    showPurchasingPowerDetails,
    setShowPurchasingPowerDetails,
    togglePurchasingPowerDetails,
  } = useHealthScoreUiContext();

  return {
    showDetails: showPurchasingPowerDetails,
    setShowDetails: setShowPurchasingPowerDetails,
    toggleDetails: togglePurchasingPowerDetails,
  };
}
