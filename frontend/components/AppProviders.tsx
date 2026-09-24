"use client";

import { CurrencyProvider } from "@/lib/currency-context";
import { PlainLanguageProvider } from "@/lib/plain-language-context";
import type { ReactNode } from "react";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <CurrencyProvider>
      <PlainLanguageProvider>{children}</PlainLanguageProvider>
    </CurrencyProvider>
  );
}
