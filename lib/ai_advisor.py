from __future__ import annotations

import os
from dataclasses import dataclass

import pandas as pd

from data_parser import INCOME_CATEGORIES
from lib.health_score import calculate_health_score
from lib.period_analyzer import CategoryChange, PeriodComparison, compare_periods

MERCHANT_CATEGORY_HINTS: dict[str, str] = {
    "starbucks": "Restaurants",
    "chipotle": "Restaurants",
    "mcdonald": "Restaurants",
    "uber": "Transport",
    "lyft": "Transport",
    "shell": "Transport",
    "whole foods": "Groceries",
    "trader joe": "Groceries",
    "netflix": "Subscriptions",
    "spotify": "Subscriptions",
    "landlord": "Rent",
    "electric": "Utilities",
    "cvs": "Healthcare",
    "amazon": "Shopping",
}


@dataclass
class CategorizationFlag:
    row_id: int
    period: str
    merchant_name: str
    current_category: str
    suggested_category: str
    reason: str
    amount: float


def detect_categorization_issues(periods: dict[str, pd.DataFrame]) -> list[CategorizationFlag]:
    flags: list[CategorizationFlag] = []
    for period_name, df in periods.items():
        for row in df.itertuples(index=True):
            merchant_lower = row.merchant_name.lower()
            category_lower = row.category.strip().lower()
            suggested = _suggested_category(merchant_lower)

            if category_lower == "unknown" and suggested:
                flags.append(
                    _build_flag(row, period_name, suggested, "Merchant usually fits another category.")
                )
                continue

            if suggested and category_lower != suggested.lower() and category_lower not in INCOME_CATEGORIES:
                flags.append(
                    _build_flag(
                        row,
                        period_name,
                        suggested,
                        f"{row.merchant_name} is categorized as {row.category}, but often maps to {suggested}.",
                    )
                )
                continue

            if row.transaction_type == "income" and category_lower not in INCOME_CATEGORIES:
                flags.append(
                    _build_flag(
                        row,
                        period_name,
                        row.category,
                        "This looks like an expense merchant tagged with an unusual income category.",
                    )
                )

            if row.transaction_type == "expense" and category_lower in INCOME_CATEGORIES:
                flags.append(
                    _build_flag(
                        row,
                        period_name,
                        "Shopping",
                        "This merchant is tagged as income but looks like spending.",
                    )
                )

    return flags[:20]


def _suggested_category(merchant_lower: str) -> str | None:
    for keyword, category in MERCHANT_CATEGORY_HINTS.items():
        if keyword in merchant_lower:
            return category
    return None


def _build_flag(row, period_name: str, suggested: str, reason: str) -> CategorizationFlag:
    return CategorizationFlag(
        row_id=int(row.Index),
        period=period_name,
        merchant_name=row.merchant_name,
        current_category=row.category,
        suggested_category=suggested,
        reason=reason,
        amount=float(row.abs_amount),
    )


def explain_category_change(change: CategoryChange) -> str:
    direction = "increased" if change.change_amount > 0 else "decreased"
    base = (
        f"{change.category} ({change.transaction_type}) {direction} by "
        f"${abs(change.change_amount):,.2f} ({change.change_pct:+.1f}%) "
        f"from ${change.previous_total:,.2f} to ${change.current_total:,.2f}."
    )
    if change.top_merchants:
        merchant_bits = [
            f"{merchant} ({'+' if delta > 0 else '-'}${abs(delta):,.2f})"
            for merchant, delta in change.top_merchants
        ]
        return f"{base} Main drivers: {', '.join(merchant_bits)}."
    return f"{base} No single merchant dominated the change."


def build_period_advice(
    periods: dict[str, pd.DataFrame],
    comparison: PeriodComparison | None,
) -> list[str]:
    advice: list[str] = []
    health = calculate_health_score(periods)
    advice.append(f"Financial health score: {health.overall}/100 — {health.summary}.")
    for detail in health.details:
        advice.append(detail)

    if comparison is None:
        latest_name = list(periods.keys())[-1]
        advice.append(f"Single-period upload detected for {latest_name}. Upload multiple tabs to compare months.")
        return advice

    advice.append(
        f"Income changed by ${comparison.income_change:,.2f} ({comparison.income_change_pct:+.1f}%) "
        f"between {comparison.previous_period} and {comparison.current_period}."
    )
    advice.append(
        f"Expenses changed by ${comparison.expense_change:,.2f} ({comparison.expense_change_pct:+.1f}%) "
        f"over the same period."
    )

    for change in comparison.category_changes[:8]:
        advice.append(explain_category_change(change))

    return advice


def enhance_with_llm(prompt: str) -> str | None:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return None

    try:
        from openai import OpenAI

        client = OpenAI(api_key=api_key)
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": "You are a concise personal finance advisor. Keep answers practical and brief.",
                },
                {"role": "user", "content": prompt},
            ],
        )
        return response.choices[0].message.content
    except Exception:
        return None
