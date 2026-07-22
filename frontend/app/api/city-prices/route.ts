import { NextRequest, NextResponse } from "next/server";

const WHERENEXT_API = "https://getwherenext.com/api/data/city-prices";

export async function GET(request: NextRequest) {
  const city = request.nextUrl.searchParams.get("city");
  const url = city
    ? `${WHERENEXT_API}?city=${encodeURIComponent(city)}`
    : WHERENEXT_API;

  try {
    const response = await fetch(url, { next: { revalidate: 86400 } });
    if (!response.ok) {
      return NextResponse.json({ error: "Could not fetch city prices." }, { status: 502 });
    }
    return NextResponse.json(await response.json());
  } catch {
    return NextResponse.json({ error: "City price service unavailable." }, { status: 502 });
  }
}
