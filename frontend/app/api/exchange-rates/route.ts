import { FALLBACK_EXCHANGE_RATES, mergeExchangeRates } from "@/lib/currency";
import { NextResponse } from "next/server";

const FRANKFURTER_TARGETS = "USD,GBP,CHF,CAD,AUD,BGN,RON,TRY";

/** Currencies not published by Frankfurter/ECB — filled from open.er-api.com (EUR base). */
const SUPPLEMENTAL_TARGETS = ["ALL", "RSD", "BAM", "MKD"] as const;

async function fetchFrankfurterRates() {
  const response = await fetch(
    `https://api.frankfurter.app/latest?from=EUR&to=${FRANKFURTER_TARGETS}`,
    { next: { revalidate: 3600 } }
  );

  if (!response.ok) return null;

  const data = await response.json();
  if (!data?.rates || typeof data.rates !== "object") return null;

  return {
    base: "EUR" as const,
    date: data.date ?? FALLBACK_EXCHANGE_RATES.date,
    rates: data.rates as Record<string, number>,
  };
}

async function fetchSupplementalRates(): Promise<Record<string, number>> {
  try {
    const response = await fetch("https://open.er-api.com/v6/latest/EUR", {
      next: { revalidate: 3600 },
    });
    if (!response.ok) return {};

    const data = await response.json();
    if (data?.result !== "success" || !data?.rates || typeof data.rates !== "object") {
      return {};
    }

    return data.rates as Record<string, number>;
  } catch {
    return {};
  }
}

function mergeSupplementalRates(
  primaryRates: Record<string, number>,
  supplementalRates: Record<string, number>
) {
  const merged = { ...primaryRates };

  for (const code of SUPPLEMENTAL_TARGETS) {
    const rate = supplementalRates[code];
    if (typeof rate === "number" && rate > 0) {
      merged[code] = rate;
    }
  }

  if (!(typeof merged.BGN === "number" && merged.BGN > 0)) {
    const bgn = supplementalRates.BGN;
    if (typeof bgn === "number" && bgn > 0) {
      merged.BGN = bgn;
    }
  }

  return merged;
}

export async function GET() {
  try {
    const frankfurter = await fetchFrankfurterRates();
    const supplemental = await fetchSupplementalRates();

    if (!frankfurter) {
      return NextResponse.json(
        mergeExchangeRates({
          rates: mergeSupplementalRates(FALLBACK_EXCHANGE_RATES.rates, supplemental),
        })
      );
    }

    return NextResponse.json(
      mergeExchangeRates({
        base: frankfurter.base,
        date: frankfurter.date,
        rates: mergeSupplementalRates(frankfurter.rates, supplemental),
      })
    );
  } catch {
    return NextResponse.json(FALLBACK_EXCHANGE_RATES);
  }
}
