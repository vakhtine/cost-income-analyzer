import { round2 } from "@/lib/utils";

export type PriceItem = {
  category: string;
  item: string;
  price_usd: number;
};

function itemMatches(category: string, item: string, keywords: string[]) {
  const haystack = `${category} ${item}`.toLowerCase();
  return keywords.some((keyword) => haystack.includes(keyword));
}

function findItem(items: PriceItem[], keywords: string[]) {
  return items.find((entry) => itemMatches(entry.category, entry.item, keywords));
}

const GROCERY_BASKET: [string[], number][] = [
  [["bread", "loaf"], 10],
  [["milk"], 12],
  [["eggs"], 3],
  [["chicken"], 5],
  [["tomato", "tomatoes"], 8],
  [["rice"], 3],
  [["potato", "potatoes"], 4],
  [["cheese"], 2],
  [["apple", "banana", "fruit"], 4],
  [["onion"], 3],
  [["beef", "pork", "meat"], 2],
  [["fish"], 2],
  [["water", "bottle"], 8],
  [["oil", "olive"], 1],
  [["pasta"], 2],
];

const RESTAURANT_BASKET: [string[], number][] = [
  [["lunch", "meal", "inexpensive", "local restaurant"], 10],
  [["fast food", "combo"], 4],
  [["cappuccino", "coffee", "latte"], 12],
  [["beer", "restaurant", "draft"], 6],
  [["wine", "glass", "raki"], 4],
  [["dinner", "mid-range", "three-course"], 4],
  [["cocktail"], 2],
];

function estimateFromBasket(
  items: PriceItem[],
  basket: [string[], number][],
  sparseMultiplier: number,
  coverageScale = 1
) {
  let basketTotal = 0;
  let hits = 0;

  for (const [keywords, quantity] of basket) {
    const match = findItem(items, keywords);
    if (!match) continue;
    basketTotal += match.price_usd * quantity;
    hits += 1;
  }

  if (hits >= 3) {
    return round2(basketTotal * coverageScale);
  }

  const unitSum = items.reduce((sum, entry) => sum + entry.price_usd, 0);
  return hits > 0 ? round2(Math.max(basketTotal * coverageScale, unitSum * sparseMultiplier)) : 0;
}

function estimateGroceriesMonthly(items: PriceItem[]) {
  const groceries = items.filter((entry) => entry.category === "Groceries");
  return estimateFromBasket(groceries, GROCERY_BASKET, 22, 3.6);
}

function estimateRestaurantsMonthly(items: PriceItem[]) {
  const restaurants = items.filter((entry) => entry.category === "Restaurants & Cafes");
  return estimateFromBasket(restaurants, RESTAURANT_BASKET, 10, 1);
}

function estimateUtilitiesMonthly(items: PriceItem[]) {
  const utilities = items.filter((entry) => entry.category === "Utilities & Internet");
  return round2(utilities.reduce((sum, entry) => sum + entry.price_usd, 0));
}

function estimateEntertainmentMonthly(items: PriceItem[]) {
  const leisure = items.filter((entry) => entry.category === "Leisure & Fitness");
  let total = 0;

  for (const entry of leisure) {
    const label = entry.item.toLowerCase();
    if (label.includes("membership") || label.includes("gym") || label.includes("fitness")) {
      total += entry.price_usd;
    } else if (label.includes("cinema") || label.includes("theatre") || label.includes("ticket")) {
      total += entry.price_usd * 2;
    } else if (label.includes("tennis") || label.includes("court")) {
      total += entry.price_usd * 4;
    } else {
      total += entry.price_usd * 3;
    }
  }

  return round2(total);
}

function estimateRentMonthly(items: PriceItem[]) {
  const center = findItem(items, ["1-bedroom", "center", "city centre", "blloku"]);
  const outside = findItem(items, ["1-bedroom", "outside"]);
  return round2(center?.price_usd ?? outside?.price_usd ?? 0);
}

function estimateTransitMonthly(items: PriceItem[]) {
  const pass = findItem(items, ["monthly", "transit", "pass"]);
  if (pass) return round2(pass.price_usd);

  const oneWay = findItem(items, [
    "one-way",
    "single ticket",
    "bus ticket",
    "metro ticket",
    "tram ticket",
    "local transport",
  ]);
  if (oneWay) return round2(oneWay.price_usd * 44);

  return 0;
}

function estimateGasMonthly(items: PriceItem[]) {
  const gasoline = findItem(items, ["gasoline", "petrol", "fuel"]);
  if (gasoline) return round2(gasoline.price_usd * 40);
  return 0;
}

export function buildMonthlyBenchmarks(items: PriceItem[]) {
  return {
    rent: estimateRentMonthly(items),
    groceries: estimateGroceriesMonthly(items),
    restaurants: estimateRestaurantsMonthly(items),
    transport: estimateTransitMonthly(items),
    gas: estimateGasMonthly(items),
    utilities: estimateUtilitiesMonthly(items),
    entertainment: estimateEntertainmentMonthly(items),
  };
}

export const MONTHLY_BENCHMARK_NOTE =
  "Reference monthly costs are estimated from item-level prices using standard consumption baskets (groceries, dining out, rent, etc.), not single-unit totals.";
