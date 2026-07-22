from __future__ import annotations

from dataclasses import dataclass

import pandas as pd

NON_ESSENTIAL_CATEGORIES = {
    "restaurants",
    "cafe",
    "cafes",
    "coffee",
    "entertainment",
    "dining",
    "bars",
    "takeout",
}


@dataclass
class HealthScore:
    overall: int
    savings_rate_score: int
    income_stability_score: int
    non_essential_score: int
    summary: str
    details: list[str]


def calculate_health_score(periods: dict[str, pd.DataFrame]) -> HealthScore:
    latest_name = list(periods.keys())[-1]
    latest = periods[latest_name]
    total_income = float(latest.loc[latest["transaction_type"] == "income", "abs_amount"].sum())
    total_expenses = float(latest.loc[latest["transaction_type"] == "expense", "abs_amount"].sum())
    savings_rate = ((total_income - total_expenses) / total_income * 100) if total_income else 0.0

    savings_rate_score = _score_savings_rate(savings_rate)
    income_stability_score = _score_income_stability(periods)
    non_essential_score = _score_non_essential(latest, total_income)

    overall = round(
        savings_rate_score * 0.4
        + income_stability_score * 0.3
        + non_essential_score * 0.3
    )

    details = [
        f"Savings rate: {savings_rate:.1f}% (score {savings_rate_score}/100)",
        f"Income stability across periods (score {income_stability_score}/100)",
        f"Non-essential spending control (score {non_essential_score}/100)",
    ]
    summary = _health_summary(overall)

    return HealthScore(
        overall=overall,
        savings_rate_score=savings_rate_score,
        income_stability_score=income_stability_score,
        non_essential_score=non_essential_score,
        summary=summary,
        details=details,
    )


def _score_savings_rate(savings_rate: float) -> int:
    if savings_rate >= 20:
        return 100
    if savings_rate >= 10:
        return 80
    if savings_rate >= 0:
        return 55
    if savings_rate >= -10:
        return 35
    return 15


def _score_income_stability(periods: dict[str, pd.DataFrame]) -> int:
    incomes = []
    for df in periods.values():
        incomes.append(float(df.loc[df["transaction_type"] == "income", "abs_amount"].sum()))

    if len(incomes) <= 1:
        latest = periods[list(periods.keys())[-1]]
        income_rows = latest[latest["transaction_type"] == "income"]
        source_count = income_rows["category"].nunique()
        if source_count >= 3:
            return 90
        if source_count == 2:
            return 75
        return 60

    series = pd.Series(incomes)
    if series.mean() == 0:
        return 20
    volatility = series.std(ddof=0) / series.mean()
    if volatility <= 0.05:
        return 95
    if volatility <= 0.15:
        return 75
    if volatility <= 0.30:
        return 55
    return 35


def _score_non_essential(df: pd.DataFrame, total_income: float) -> int:
    if total_income == 0:
        return 40

    expense_rows = df[df["transaction_type"] == "expense"].copy()
    expense_rows["normalized_category"] = expense_rows["category"].str.strip().str.lower()
    non_essential_total = float(
        expense_rows.loc[
            expense_rows["normalized_category"].isin(NON_ESSENTIAL_CATEGORIES),
            "abs_amount",
        ].sum()
    )
    ratio = non_essential_total / total_income * 100
    if ratio <= 8:
        return 95
    if ratio <= 15:
        return 75
    if ratio <= 25:
        return 55
    if ratio <= 35:
        return 35
    return 15


def _health_summary(score: int) -> str:
    if score >= 80:
        return "Strong financial health"
    if score >= 65:
        return "Healthy with room to improve"
    if score >= 50:
        return "Moderate financial health"
    return "Needs attention"
