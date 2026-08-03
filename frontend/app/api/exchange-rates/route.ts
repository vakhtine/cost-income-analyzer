import { NextResponse } from "next/server";

const TARGETS =
  "USD,EUR,GBP,ALL,RSD,BAM,MKD,CHF,CAD,AUD,BGN,RON,TRY";

const FALLBACK_RATES = {
  base: "EUR" as const,
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
};

export async function GET() {
  try {
    const response = await fetch(
      `https://api.frankfurter.app/latest?from=EUR&to=${TARGETS}`,
      { next: { revalidate: 3600 } }
    );

    if (!response.ok) {
      return NextResponse.json(FALLBACK_RATES);
    }

    const data = await response.json();
    if (!data?.rates || typeof data.rates !== "object") {
      return NextResponse.json(FALLBACK_RATES);
    }

    return NextResponse.json({
      base: "EUR",
      date: data.date ?? FALLBACK_RATES.date,
      rates: data.rates,
    });
  } catch {
    return NextResponse.json(FALLBACK_RATES);
  }
}
