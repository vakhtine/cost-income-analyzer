import { NextResponse } from "next/server";

const TARGETS =
  "USD,EUR,GBP,ALL,RSD,BAM,MKD,CHF,CAD,AUD,BGN,RON,TRY";

export async function GET() {
  try {
    const response = await fetch(
      `https://api.frankfurter.app/latest?from=EUR&to=${TARGETS}`,
      { next: { revalidate: 3600 } }
    );

    if (!response.ok) {
      return NextResponse.json({ error: "Could not fetch exchange rates." }, { status: 502 });
    }

    const data = await response.json();
    return NextResponse.json({
      base: "EUR",
      date: data.date,
      rates: data.rates,
    });
  } catch {
    return NextResponse.json({ error: "Exchange rate service unavailable." }, { status: 502 });
  }
}
