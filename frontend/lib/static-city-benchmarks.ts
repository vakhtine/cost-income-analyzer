import type { CityCostItem } from "@/lib/city-cost-items";

// Monthly average costs per person in USD (illustrative benchmarks).
// Used for cities not covered by the live WhereNext API.
export const STATIC_CITY_BENCHMARKS: Record<
  string,
  Record<string, number>
> = {
  "Podgorica, Montenegro": {
    rent: 520,
    groceries: 280,
    restaurants: 220,
    transport: 45,
    utilities: 95,
    entertainment: 35,
  },
  "Abbotsford, Canada": {
    rent: 1450,
    groceries: 380,
    restaurants: 320,
    transport: 120,
    utilities: 155,
    entertainment: 140,
  },
  "New York, USA": {
    rent: 2800,
    groceries: 450,
    restaurants: 380,
    transport: 180,
    utilities: 170,
    entertainment: 220,
  },
  "Los Angeles, USA": {
    rent: 2400,
    groceries: 420,
    restaurants: 350,
    transport: 200,
    utilities: 160,
    entertainment: 210,
  },  "Chicago, USA": {
    rent: 1800,
    groceries: 360,
    restaurants: 280,
    transport: 140,
    utilities: 140,
    entertainment: 170,
  },
  "Toronto, Canada": {
    rent: 2200,
    groceries: 400,
    restaurants: 320,
    transport: 160,
    utilities: 150,
    entertainment: 190,
  },
  "Vancouver, Canada": {
    rent: 2300,
    groceries: 410,
    restaurants: 330,
    transport: 150,
    utilities: 145,
    entertainment: 195,
  },
  "Montreal, Canada": {
    rent: 1600,
    groceries: 350,
    restaurants: 270,
    transport: 120,
    utilities: 130,
    entertainment: 160,
  },
};

export const STATIC_BENCHMARK_META = {
  source: "Illustrative monthly benchmarks (USD)",
  updated: "2026",
  license: "Internal reference data",
  citation:
    "Monthly per-person cost estimates compiled from public cost-of-living surveys. Live data used where available.",
};

function staticCostItems(values: Record<string, number>): CityCostItem[] {
  return [
    { key: "inexpensive_meal", label: "Meal at inexpensive restaurant", unit: "1 meal", priceUsd: values.inexpensive_meal, priceLocal: null, estimated: false },
    { key: "fast_food_combo", label: "McDonald's combo meal", unit: "1 combo", priceUsd: values.fast_food_combo, priceLocal: null, estimated: false },
    { key: "coffee", label: "Coffee", unit: "1 cup", priceUsd: values.coffee, priceLocal: null, estimated: false },
    { key: "beer", label: "Beer", unit: "0.5L, restaurant", priceUsd: values.beer, priceLocal: null, estimated: false },
    { key: "milk", label: "Milk", unit: "1 liter", priceUsd: values.milk, priceLocal: null, estimated: false },
    { key: "bread", label: "Bread", unit: "500g loaf", priceUsd: values.bread, priceLocal: null, estimated: false },
    { key: "eggs", label: "Eggs", unit: "12 eggs", priceUsd: values.eggs, priceLocal: null, estimated: false },
    { key: "apples", label: "Apples", unit: "1 kg", priceUsd: values.apples, priceLocal: null, estimated: false },
    { key: "local_transport_one_way", label: "Local transport (one way)", unit: "1 ticket", priceUsd: values.local_transport_one_way, priceLocal: null, estimated: false },
    { key: "mobile_plan", label: "Mobile monthly plan", unit: "per month", priceUsd: values.mobile_plan, priceLocal: null, estimated: false },
    { key: "basic_utilities", label: "Basic utilities", unit: "85m² apartment", priceUsd: values.basic_utilities, priceLocal: null, estimated: false },
    { key: "gym_membership", label: "Fitness studio membership", unit: "per month", priceUsd: values.gym_membership, priceLocal: null, estimated: false },
  ];
}

export const STATIC_CITY_COST_ITEMS: Record<string, CityCostItem[]> = {
  "Podgorica, Montenegro": staticCostItems({
    inexpensive_meal: 6,
    fast_food_combo: 5.5,
    coffee: 1.4,
    beer: 2.2,
    milk: 1.05,
    bread: 0.65,
    eggs: 1.9,
    apples: 1.2,
    local_transport_one_way: 0.9,
    mobile_plan: 12,
    basic_utilities: 92,
    gym_membership: 28,
  }),
  "Chicago, USA": staticCostItems({    inexpensive_meal: 18,
    fast_food_combo: 11,
    coffee: 5.2,
    beer: 7,
    milk: 1.1,
    bread: 3.6,
    eggs: 3.9,
    apples: 5.4,
    local_transport_one_way: 2.75,
    mobile_plan: 45,
    basic_utilities: 175,
    gym_membership: 58,
  }),
  "Toronto, Canada": staticCostItems({
    inexpensive_meal: 19,
    fast_food_combo: 12,
    coffee: 4.8,
    beer: 7.5,
    milk: 3.2,
    bread: 3.1,
    eggs: 4.2,
    apples: 4.9,
    local_transport_one_way: 3.3,
    mobile_plan: 42,
    basic_utilities: 165,
    gym_membership: 52,
  }),
  "Montreal, Canada": staticCostItems({
    inexpensive_meal: 17,
    fast_food_combo: 11,
    coffee: 4.5,
    beer: 7,
    milk: 3,
    bread: 2.9,
    eggs: 3.8,
    apples: 4.6,
    local_transport_one_way: 3.1,
    mobile_plan: 38,
    basic_utilities: 145,
    gym_membership: 48,
  }),
};
