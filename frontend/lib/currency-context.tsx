"use client";

import {
  convertExpenseAmount,
  convertIncomeAmount,
  convertAmount,
  CurrencyCode,
  CurrencySettings,
  DEFAULT_CURRENCY_SETTINGS,
  ExchangeRates,
  formatMoney,
  loadCurrencySettings,
  saveCurrencySettings,
} from "@/lib/currency";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type CurrencyContextValue = {
  settings: CurrencySettings;
  rates: ExchangeRates | null;
  ratesLoading: boolean;
  ratesError: string;
  ratesDate: string;
  setIncomeCurrency: (code: CurrencyCode) => void;
  setExpenseCurrency: (code: CurrencyCode) => void;
  setDisplayCurrency: (code: CurrencyCode) => void;
  formatIncome: (amount: number) => string;
  formatExpense: (amount: number) => string;
  formatDisplay: (amount: number, currency?: CurrencyCode) => string;
  convertIncome: (amount: number) => number;
  convertExpense: (amount: number) => number;
  formatUsd: (amount: number) => string;
  convertReferenceCost: (amountUsd: number) => number;
  refreshRates: () => Promise<void>;
};

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<CurrencySettings>(DEFAULT_CURRENCY_SETTINGS);
  const [rates, setRates] = useState<ExchangeRates | null>(null);
  const [ratesLoading, setRatesLoading] = useState(false);
  const [ratesError, setRatesError] = useState("");

  useEffect(() => {
    setSettings(loadCurrencySettings());
  }, []);

  const refreshRates = useCallback(async () => {
    setRatesLoading(true);
    setRatesError("");
    try {
      const response = await fetch("/api/exchange-rates");
      if (!response.ok) throw new Error("Could not load exchange rates.");
      const data = (await response.json()) as ExchangeRates;
      setRates(data);
      if (data.date === "fallback") {
        setRatesError("");
      }
    } catch (error) {
      setRatesError(error instanceof Error ? error.message : "Could not load exchange rates.");
    } finally {
      setRatesLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshRates();
  }, [refreshRates]);

  const updateSettings = useCallback((next: Partial<CurrencySettings>) => {
    setSettings((current) => {
      const merged = { ...current, ...next };
      saveCurrencySettings(merged);
      return merged;
    });
  }, []);

  const fallbackRates = useMemo<ExchangeRates>(
    () => ({
      base: "EUR",
      date: "fallback",
      rates: {
        USD: 1.08,
        GBP: 0.85,
        ALL: 103,
        RSD: 117,
        BAM: 1.96,
        MKD: 61.5,
        CHF: 0.96,
        CAD: 1.47,
        AUD: 1.65,
        BGN: 1.96,
        RON: 4.97,
        TRY: 35,
      },
    }),
    []
  );

  const activeRates = rates ?? fallbackRates;

  const convertIncome = useCallback(
    (amount: number) =>
      convertIncomeAmount(amount, settings.incomeCurrency, settings.displayCurrency, activeRates),
    [settings.incomeCurrency, settings.displayCurrency, activeRates]
  );

  const convertExpense = useCallback(
    (amount: number) =>
      convertExpenseAmount(amount, settings.expenseCurrency, settings.displayCurrency, activeRates),
    [settings.expenseCurrency, settings.displayCurrency, activeRates]
  );

  const convertReferenceCost = useCallback(
    (amountUsd: number) =>
      convertAmount(amountUsd, "USD", settings.displayCurrency, activeRates),
    [settings.displayCurrency, activeRates]
  );

  const value = useMemo<CurrencyContextValue>(
    () => ({
      settings,
      rates: activeRates,
      ratesLoading,
      ratesError,
      ratesDate: activeRates.date,
      setIncomeCurrency: (code) => updateSettings({ incomeCurrency: code }),
      setExpenseCurrency: (code) => updateSettings({ expenseCurrency: code }),
      setDisplayCurrency: (code) => updateSettings({ displayCurrency: code }),
      formatIncome: (amount) => formatMoney(convertIncome(amount), settings.displayCurrency),
      formatExpense: (amount) => formatMoney(convertExpense(amount), settings.displayCurrency),
      formatDisplay: (amount, currency = settings.displayCurrency) =>
        formatMoney(amount, currency),
      formatUsd: (amount) =>
        formatMoney(convertReferenceCost(amount), settings.displayCurrency),
      convertIncome,
      convertExpense,
      convertReferenceCost,
      refreshRates,
    }),
    [
      settings,
      activeRates,
      ratesLoading,
      ratesError,
      updateSettings,
      convertIncome,
      convertExpense,
      convertReferenceCost,
      refreshRates,
    ]
  );

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error("useCurrency must be used within CurrencyProvider");
  }
  return context;
}
