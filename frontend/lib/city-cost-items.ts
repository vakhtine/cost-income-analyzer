import { WHERENEXT_CITY_KEYS } from "@/lib/constants";
import { PriceItem } from "@/lib/benchmark-calculator";
import { STATIC_CITY_COST_ITEMS } from "@/lib/static-city-benchmarks";
import { round2 } from "@/lib/utils";

import { fetchWhereNextCityPrices } from "@/lib/wherenext-api";

export type CityCostItemKey =
  | "inexpensive_meal"
  | "fast_food_combo"
  | "coffee"
  | "beer"
  | "milk"
  | "bread"
  | "eggs"
  | "apples"
  | "local_transport_one_way"
  | "mobile_plan"
  | "basic_utilities"
  | "gym_membership";

export type CityCostItemDefinition = {
  key: CityCostItemKey;
  label: string;
  unit: string;
  keywords: string[];
  exclude?: string[];
  preferCategories?: string[];
};

export const CITY_COST_ITEM_DEFINITIONS: CityCostItemDefinition[] = [
  {
    key: "inexpensive_meal",
    label: "Meal at inexpensive restaurant",
    unit: "1 meal",
    keywords: ["lunch menu", "inexpensive", "local restaurant", "business district", "cevapi", "meal"],
    preferCategories: ["Restaurants & Cafes"],
  },
  {
    key: "fast_food_combo",
    label: "McDonald's combo meal",
    unit: "1 combo",
    keywords: ["fast food combo", "mcdonald", "combo meal"],
    preferCategories: ["Restaurants & Cafes"],
  },
  {
    key: "coffee",
    label: "Coffee",
    unit: "1 cup",
    keywords: ["cappuccino", "coffee", "latte"],
    preferCategories: ["Restaurants & Cafes"],
  },
  {
    key: "beer",
    label: "Beer",
    unit: "0.5L, restaurant",
    keywords: ["beer"],
    exclude: ["store"],
    preferCategories: ["Restaurants & Cafes"],
  },
  {
    key: "milk",
    label: "Milk",
    unit: "1 liter",
    keywords: ["milk"],
    preferCategories: ["Groceries"],
  },
  {
    key: "bread",
    label: "Bread",
    unit: "500g loaf",
    keywords: ["bread", "loaf"],
    preferCategories: ["Groceries"],
  },
  {
    key: "eggs",
    label: "Eggs",
    unit: "12 eggs",
    keywords: ["eggs"],
    preferCategories: ["Groceries"],
  },
  {
    key: "apples",
    label: "Apples",
    unit: "1 kg",
    keywords: ["apples", "apple"],
    preferCategories: ["Groceries"],
  },
  {
    key: "local_transport_one_way",
    label: "Local transport (one way)",
    unit: "1 ticket",
    keywords: ["one-way", "single ticket", "bus ticket", "metro ticket", "tram ticket", "local transport"],
    preferCategories: ["Transport"],
  },
  {
    key: "mobile_plan",
    label: "Mobile monthly plan",
    unit: "per month",
    keywords: ["mobile plan", "phone plan", "prepaid", "mobile phone"],
    preferCategories: ["Utilities & Internet"],
  },
  {
    key: "basic_utilities",
    label: "Basic utilities",
    unit: "85m² apartment",
    keywords: ["electricity, water", "electricity water", "basic utilities", "water, electricity", "garbage"],
    preferCategories: ["Utilities & Internet"],
  },
  {
    key: "gym_membership",
    label: "Fitness studio membership",
    unit: "per month",
    keywords: ["gym membership", "fitness", "gym"],
    preferCategories: ["Leisure & Fitness"],
  },
];

export const COST_ITEM_CATEGORIES = [
  {
    label: "Restaurants",
    icon: "🍽️",
    keys: ["inexpensive_meal", "fast_food_combo", "coffee", "beer"] as CityCostItemKey[],
  },
  {
    label: "Groceries",
    icon: "🛒",
    keys: ["milk", "bread", "eggs", "apples"] as CityCostItemKey[],
  },
  {
    label: "Transport & utilities",
    icon: "🚌",
    keys: ["local_transport_one_way", "mobile_plan", "basic_utilities", "gym_membership"] as CityCostItemKey[],
  },
] as const;

export function cityShortName(label: string) {
  return label.split(",")[0]?.trim() ?? label;
}

export function costDifferencePct(baseUsd: number, destUsd: number) {
  if (!baseUsd) return destUsd ? 100 : 0;
  return ((destUsd - baseUsd) / baseUsd) * 100;
}

export function formatLocalPrice(amount: number | null, currency: string | null) {
  if (amount === null || !currency) return null;
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: currency === "ALL" || currency === "RSD" ? 0 : 2,
  }).format(amount);
}

export const EXPATISTAN_ITEM_LABELS: Partial<Record<CityCostItemKey, string>> = {
  inexpensive_meal: "Meal at an Inexpensive Restaurant",
  fast_food_combo: "Combo Meal at McDonald's (or Equivalent Fast-Food Meal)",
  coffee: "Cappuccino (Regular Size)",
  beer: "Domestic Draft Beer (0.5 Liter)",
  milk: "Milk (1 Liter)",
  bread: "Loaf of Fresh White Bread (500g)",
  eggs: "Eggs (12)",
  apples: "Apples (1 kg)",
  local_transport_one_way: "Local Transport (One-Way Ticket)",
  mobile_plan: "Mobile Phone Monthly Plan (with Calls and Data)",
  basic_utilities: "Basic Utilities (Water, Electricity, Heating)",
  gym_membership: "Monthly Fitness Club Membership",
};

export type CityCostItem = {
  key: CityCostItemKey;
  label: string;
  unit: string;
  priceUsd: number;
  priceLocal: number | null;
  estimated: boolean;
};

export type CityCostProfile = {
  city: string;
  items: CityCostItem[];
  metadata: {
    source: string;
    updated: string;
    dataSource: string;
    license: string;
    localCurrency: string | null;
  };
};

type WhereNextRow = PriceItem & { price_local?: number };

type WhereNextResponse = {
  metadata: {
    source: string;
    updated: string;
    license: string;
    data_source?: string;
    currency?: string;
  };
  data: WhereNextRow[];
};

function itemMatches(entry: WhereNextRow, keywords: string[], exclude: string[] = []) {
  const haystack = `${entry.category} ${entry.item}`.toLowerCase();
  if (exclude.some((term) => haystack.includes(term))) return false;
  return keywords.some((keyword) => haystack.includes(keyword.toLowerCase()));
}

function findBestItem(items: WhereNextRow[], definition: CityCostItemDefinition) {
  const preferred = definition.preferCategories?.length
    ? items.filter((entry) => definition.preferCategories!.includes(entry.category))
    : items;

  const pool = preferred.length ? preferred : items;
  return pool.find((entry) => itemMatches(entry, definition.keywords, definition.exclude));
}

function estimateMissingItem(
  key: CityCostItemKey,
  items: WhereNextRow[],
  resolved: Partial<Record<CityCostItemKey, number>>
): number | null {
  switch (key) {
    case "local_transport_one_way": {
      const monthly = items.find((entry) =>
        `${entry.category} ${entry.item}`.toLowerCase().includes("monthly transit")
      );
      if (monthly) return round2(monthly.price_usd / 44);
      return null;
    }
    case "mobile_plan": {
      const internet = items.find((entry) =>
        `${entry.item}`.toLowerCase().includes("internet")
      );
      if (internet) return round2(Math.max(internet.price_usd * 0.55, 8));
      return null;
    }
    case "apples": {
      const fruit = items.find((entry) =>
        ["banana", "fruit", "orange"].some((term) => entry.item.toLowerCase().includes(term))
      );
      return fruit ? round2(fruit.price_usd) : null;
    }
    case "inexpensive_meal": {
      const fallback = items.find(
        (entry) =>
          entry.category === "Restaurants & Cafes" &&
          !entry.item.toLowerCase().includes("fast food")
      );
      return fallback ? round2(fallback.price_usd) : null;
    }
    default:
      return resolved[key] ?? null;
  }
}

export function extractCityCostItems(
  items: WhereNextRow[],
  localCurrency: string | null
): CityCostItem[] {
  const resolvedUsd: Partial<Record<CityCostItemKey, number>> = {};

  for (const definition of CITY_COST_ITEM_DEFINITIONS) {
    const match = findBestItem(items, definition);
    if (match) resolvedUsd[definition.key] = match.price_usd;
  }

  return CITY_COST_ITEM_DEFINITIONS.map((definition) => {
    const match = findBestItem(items, definition);
    let priceUsd = match?.price_usd ?? estimateMissingItem(definition.key, items, resolvedUsd);
    let estimated = false;

    if (priceUsd === null) {
      priceUsd = 0;
      estimated = true;
    } else if (!match) {
      estimated = true;
    }

    return {
      key: definition.key,
      label: definition.label,
      unit: definition.unit,
      priceUsd: round2(priceUsd),
      priceLocal: match?.price_local ?? null,
      estimated,
    };
  });
}

export function sumCategoryItems(
  profile: CityCostProfile,
  keys: readonly CityCostItemKey[]
) {
  const map = Object.fromEntries(profile.items.map((item) => [item.key, item.priceUsd]));
  return round2(keys.reduce((sum, key) => sum + (map[key] ?? 0), 0));
}

/** Scale sample basket prices to estimated monthly spend for side-by-side city tables. */
const ITEM_MONTHLY_MULTIPLIERS: Partial<Record<CityCostItemKey, number>> = {
  inexpensive_meal: 6,
  fast_food_combo: 4,
  coffee: 12,
  beer: 4,
  milk: 32,
  bread: 24,
  eggs: 8,
  apples: 16,
  local_transport_one_way: 44,
  mobile_plan: 1,
  basic_utilities: 1,
  gym_membership: 1,
};

export function sumCategoryItemsMonthly(
  profile: CityCostProfile,
  keys: readonly CityCostItemKey[]
) {
  const map = Object.fromEntries(profile.items.map((item) => [item.key, item.priceUsd]));
  return round2(
    keys.reduce(
      (sum, key) => sum + (map[key] ?? 0) * (ITEM_MONTHLY_MULTIPLIERS[key] ?? 1),
      0
    )
  );
}

export async function fetchCityCostProfile(cityLabel: string): Promise<CityCostProfile> {
  const staticItems = STATIC_CITY_COST_ITEMS[cityLabel];
  if (staticItems) {
    return {
      city: cityLabel,
      items: staticItems,
      metadata: {
        source: "Illustrative cost-of-living reference (USD)",
        updated: "2026",
        dataSource: "Public cost-of-living surveys",
        license: "Internal reference data",
        localCurrency: "USD",
      },
    };
  }

  const cityKey = WHERENEXT_CITY_KEYS[cityLabel];
  if (!cityKey) {
    throw new Error(`Typical costs are not available for ${cityLabel}.`);
  }

  const payload = await fetchWhereNextCityPrices<WhereNextResponse>(cityKey);

  return {
    city: cityLabel,
    items: extractCityCostItems(payload.data, payload.metadata.currency ?? null),
    metadata: {
      source: payload.metadata.source,
      updated: payload.metadata.updated,
      dataSource: payload.metadata.data_source ?? payload.metadata.source,
      license: payload.metadata.license,
      localCurrency: payload.metadata.currency ?? null,
    },
  };
}

export async function fetchCityCostProfiles(cities: string[]) {
  const unique = [...new Set(cities.filter(Boolean))];
  const profiles = await Promise.all(
    unique.map(async (city) => {
      try {
        return await fetchCityCostProfile(city);
      } catch {
        return null;
      }
    })
  );

  return Object.fromEntries(
    unique
      .map((city, index) => [city, profiles[index]] as const)
      .filter((entry): entry is [string, CityCostProfile] => entry[1] !== null)
  );
}
