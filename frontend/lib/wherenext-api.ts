export async function fetchWhereNextCityPrices<T = unknown>(cityKey?: string): Promise<T> {
  const url = cityKey
    ? `/api/city-prices?city=${encodeURIComponent(cityKey)}`
    : "/api/city-prices";

  const response = await fetch(url);
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? "Could not fetch city prices.");
  }

  return response.json() as Promise<T>;
}
