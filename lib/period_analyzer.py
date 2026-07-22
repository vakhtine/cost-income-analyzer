from __future__ import annotations

from dataclasses import dataclass

import pandas as pd

from lib.analyzer import AnalysisResult, analyze_transactions


@dataclass
class CategoryChange:
    category: str
    transaction_type: str
    previous_total: float
    current_total: float
    change_amount: float
    change_pct: float
    top_merchants: list[tuple[str, float]]


@dataclass
class PeriodComparison:
    previous_period: str
    current_period: str
    income_change: float
    income_change_pct: float
    expense_change: float
    expense_change_pct: float
    category_changes: list[CategoryChange]


def analyze_period(df: pd.DataFrame) -> AnalysisResult:
    return analyze_transactions(df)


def compare_periods(
    previous_df: pd.DataFrame,
    current_df: pd.DataFrame,
    previous_name: str,
    current_name: str,
) -> PeriodComparison:
    previous = analyze_transactions(previous_df)
    current = analyze_transactions(current_df)

    income_change = current.total_income - previous.total_income
    expense_change = current.total_expenses - previous.total_expenses
    income_change_pct = _pct_change(previous.total_income, current.total_income)
    expense_change_pct = _pct_change(previous.total_expenses, current.total_expenses)

    category_changes = _build_category_changes(previous_df, current_df)
    return PeriodComparison(
        previous_period=previous_name,
        current_period=current_name,
        income_change=income_change,
        income_change_pct=income_change_pct,
        expense_change=expense_change,
        expense_change_pct=expense_change_pct,
        category_changes=category_changes,
    )


def _pct_change(previous: float, current: float) -> float:
    if previous == 0:
        return 100.0 if current else 0.0
    return (current - previous) / previous * 100


def _category_totals(df: pd.DataFrame) -> pd.DataFrame:
    return (
        df.groupby(["transaction_type", "category"], as_index=False)["abs_amount"]
        .sum()
        .rename(columns={"abs_amount": "total"})
    )


def _merchant_drivers(
    previous_df: pd.DataFrame,
    current_df: pd.DataFrame,
    transaction_type: str,
    category: str,
    limit: int = 3,
) -> list[tuple[str, float]]:
    def totals(frame: pd.DataFrame) -> pd.Series:
        subset = frame[
            (frame["transaction_type"] == transaction_type) & (frame["category"] == category)
        ]
        if subset.empty:
            return pd.Series(dtype=float)
        return subset.groupby("merchant_name")["abs_amount"].sum()

    previous_totals = totals(previous_df)
    current_totals = totals(current_df)
    merchants = sorted(set(previous_totals.index).union(set(current_totals.index)))
    deltas = []
    for merchant in merchants:
        delta = float(current_totals.get(merchant, 0.0) - previous_totals.get(merchant, 0.0))
        if abs(delta) > 0.01:
            deltas.append((merchant, delta))
    deltas.sort(key=lambda item: abs(item[1]), reverse=True)
    return deltas[:limit]


def _build_category_changes(
    previous_df: pd.DataFrame,
    current_df: pd.DataFrame,
) -> list[CategoryChange]:
    previous_totals = _category_totals(previous_df)
    current_totals = _category_totals(current_df)

    keys = set(
        zip(previous_totals["transaction_type"], previous_totals["category"])
    ).union(
        zip(current_totals["transaction_type"], current_totals["category"])
    )

    changes: list[CategoryChange] = []
    for transaction_type, category in sorted(keys):
        previous_value = float(
            previous_totals.loc[
                (previous_totals["transaction_type"] == transaction_type)
                & (previous_totals["category"] == category),
                "total",
            ].sum()
        )
        current_value = float(
            current_totals.loc[
                (current_totals["transaction_type"] == transaction_type)
                & (current_totals["category"] == category),
                "total",
            ].sum()
        )
        change_amount = current_value - previous_value
        if abs(change_amount) < 0.01:
            continue
        changes.append(
            CategoryChange(
                category=category,
                transaction_type=transaction_type,
                previous_total=previous_value,
                current_total=current_value,
                change_amount=change_amount,
                change_pct=_pct_change(previous_value, current_value),
                top_merchants=_merchant_drivers(
                    previous_df, current_df, transaction_type, category
                ),
            )
        )

    changes.sort(key=lambda item: abs(item.change_amount), reverse=True)
    return changes
