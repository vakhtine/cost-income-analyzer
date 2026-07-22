from __future__ import annotations

import pandas as pd

from data_parser import classify_rows


def is_unknown_category(category: str) -> bool:
    return category.strip().lower() == "unknown"


def get_known_expense_categories(df: pd.DataFrame) -> list[str]:
    expense_rows = df[df["transaction_type"] == "expense"]
    categories = {
        category
        for category in expense_rows["category"].unique()
        if not is_unknown_category(category)
    }
    return sorted(categories)


def get_unknown_merchants(df: pd.DataFrame) -> pd.DataFrame:
    unknown_rows = df[
        (df["transaction_type"] == "expense")
        & df["category"].map(is_unknown_category)
    ]
    if unknown_rows.empty:
        return unknown_rows

    return (
        unknown_rows.groupby("merchant_name", as_index=False)["abs_amount"]
        .sum()
        .rename(columns={"abs_amount": "total"})
        .sort_values("total", ascending=False)
    )


def apply_merchant_categories(
    df: pd.DataFrame,
    assignments: dict[str, str],
) -> pd.DataFrame:
    columns = [column for column in ["merchant_name", "category", "amount", "date", "period"] if column in df.columns]
    base = df[columns].copy()

    for merchant_name, category in assignments.items():
        mask = (base["merchant_name"] == merchant_name) & base["category"].map(is_unknown_category)
        base.loc[mask, "category"] = category

    return classify_rows(base)
