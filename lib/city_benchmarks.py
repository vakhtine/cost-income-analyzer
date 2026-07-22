from __future__ import annotations

from dataclasses import dataclass

import pandas as pd

# Monthly average costs per person in USD (illustrative benchmarks).
CITY_BENCHMARKS: dict[str, dict[str, float]] = {
    "New York, USA": {
        "rent": 2800,
        "groceries": 450,
        "restaurants": 380,
        "transport": 180,
        "utilities": 170,
        "entertainment": 220,
    },
    "Los Angeles, USA": {
        "rent": 2400,
        "groceries": 420,
        "restaurants": 350,
        "transport": 200,
        "utilities": 160,
        "entertainment": 210,
    },
    "Chicago, USA": {
        "rent": 1800,
        "groceries": 360,
        "restaurants": 280,
        "transport": 140,
        "utilities": 140,
        "entertainment": 170,
    },
    "Toronto, Canada": {
        "rent": 2200,
        "groceries": 400,
        "restaurants": 320,
        "transport": 160,
        "utilities": 150,
        "entertainment": 190,
    },
    "Vancouver, Canada": {
        "rent": 2300,
        "groceries": 410,
        "restaurants": 330,
        "transport": 150,
        "utilities": 145,
        "entertainment": 195,
    },
    "Montreal, Canada": {
        "rent": 1600,
        "groceries": 350,
        "restaurants": 270,
        "transport": 120,
        "utilities": 130,
        "entertainment": 160,
    },
    "Belgrade, Serbia": {
        "rent": 550,
        "groceries": 220,
        "restaurants": 140,
        "transport": 45,
        "utilities": 90,
        "entertainment": 80,
    },
    "Sofia, Bulgaria": {
        "rent": 500,
        "groceries": 200,
        "restaurants": 120,
        "transport": 40,
        "utilities": 85,
        "entertainment": 75,
    },
    "Tirana, Albania": {
        "rent": 480,
        "groceries": 190,
        "restaurants": 110,
        "transport": 35,
        "utilities": 80,
        "entertainment": 70,
    },
    "Podgorica, Montenegro": {
        "rent": 520,
        "groceries": 210,
        "restaurants": 125,
        "transport": 38,
        "utilities": 82,
        "entertainment": 72,
    },
    "Tbilisi, Georgia": {
        "rent": 450,
        "groceries": 180,
        "restaurants": 100,
        "transport": 30,
        "utilities": 75,
        "entertainment": 65,
    },
}

CATEGORY_ALIASES = {
    "rent": "rent",
    "housing": "rent",
    "groceries": "groceries",
    "grocery": "groceries",
    "restaurants": "restaurants",
    "restaurant": "restaurants",
    "dining": "restaurants",
    "cafe": "restaurants",
    "cafes": "restaurants",
    "coffee": "restaurants",
    "transport": "transport",
    "transportation": "transport",
    "utilities": "utilities",
    "utility": "utilities",
    "entertainment": "entertainment",
}


@dataclass
class LocationComparison:
    category: str
    user_amount: float
    reference_amount: float
    difference: float
    difference_pct: float
    status: str


def list_cities() -> list[str]:
    return sorted(CITY_BENCHMARKS.keys())


def compare_to_reference(
    df: pd.DataFrame,
    reference_city: str,
    household_size: int,
) -> list[LocationComparison]:
    if reference_city not in CITY_BENCHMARKS:
        return []

    benchmarks = CITY_BENCHMARKS[reference_city]
    expense_rows = df[df["transaction_type"] == "expense"].copy()
    expense_rows["benchmark_key"] = expense_rows["category"].str.strip().str.lower().map(
        lambda value: CATEGORY_ALIASES.get(value)
    )
    expense_rows = expense_rows.dropna(subset=["benchmark_key"])

    grouped = expense_rows.groupby("benchmark_key", as_index=False)["abs_amount"].sum()
    results: list[LocationComparison] = []

    for row in grouped.itertuples(index=False):
        reference_amount = benchmarks[row.benchmark_key] * household_size
        difference = row.abs_amount - reference_amount
        difference_pct = (difference / reference_amount * 100) if reference_amount else 0.0
        if difference_pct > 15:
            status = "Above reference average"
        elif difference_pct < -15:
            status = "Below reference average"
        else:
            status = "Near reference average"

        results.append(
            LocationComparison(
                category=row.benchmark_key.title(),
                user_amount=float(row.abs_amount),
                reference_amount=float(reference_amount),
                difference=float(difference),
                difference_pct=float(difference_pct),
                status=status,
            )
        )

    results.sort(key=lambda item: abs(item.difference_pct), reverse=True)
    return results
