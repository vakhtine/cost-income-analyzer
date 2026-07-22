from __future__ import annotations

from dataclasses import dataclass

import pandas as pd


@dataclass
class CategorySummary:
    category: str
    total: float
    count: int
    pct_of_income: float
    pct_of_expenses: float | None


@dataclass
class MerchantSummary:
    merchant_name: str
    category: str
    total: float


@dataclass
class AnalysisResult:
    total_income: float
    total_expenses: float
    net_savings: float
    savings_rate: float
    income_categories: list[CategorySummary]
    expense_categories: list[CategorySummary]
    top_merchants: list[MerchantSummary]
    unusual_expenses: list[CategorySummary]
    insights: list[str]


def _category_totals(df: pd.DataFrame, transaction_type: str) -> pd.DataFrame:
    subset = df[df["transaction_type"] == transaction_type]
    grouped = (
        subset.groupby("category", as_index=False)["abs_amount"]
        .agg(total="sum", count="count")
        .sort_values("total", ascending=False)
    )
    return grouped


def analyze_transactions(df: pd.DataFrame) -> AnalysisResult:
    total_income = float(df.loc[df["transaction_type"] == "income", "abs_amount"].sum())
    total_expenses = float(df.loc[df["transaction_type"] == "expense", "abs_amount"].sum())
    net_savings = total_income - total_expenses
    savings_rate = (net_savings / total_income * 100) if total_income else 0.0

    income_df = _category_totals(df, "income")
    expense_df = _category_totals(df, "expense")

    income_categories = [
        CategorySummary(
            category=row.category,
            total=float(row.total),
            count=int(row.count),
            pct_of_income=(row.total / total_income * 100) if total_income else 0.0,
            pct_of_expenses=None,
        )
        for row in income_df.itertuples(index=False)
    ]

    expense_categories = [
        CategorySummary(
            category=row.category,
            total=float(row.total),
            count=int(row.count),
            pct_of_income=(row.total / total_income * 100) if total_income else 0.0,
            pct_of_expenses=(row.total / total_expenses * 100) if total_expenses else 0.0,
        )
        for row in expense_df.itertuples(index=False)
    ]

    merchant_df = (
        df[df["transaction_type"] == "expense"]
        .groupby(["merchant_name", "category"], as_index=False)["abs_amount"]
        .sum()
        .sort_values("abs_amount", ascending=False)
        .head(10)
    )
    top_merchants = [
        MerchantSummary(
            merchant_name=row.merchant_name,
            category=row.category,
            total=float(row.abs_amount),
        )
        for row in merchant_df.itertuples(index=False)
    ]

    unusual_expenses = _detect_unusual_expenses(expense_categories)
    insights = _build_insights(
        total_income=total_income,
        total_expenses=total_expenses,
        net_savings=net_savings,
        savings_rate=savings_rate,
        expense_categories=expense_categories,
        unusual_expenses=unusual_expenses,
    )

    return AnalysisResult(
        total_income=total_income,
        total_expenses=total_expenses,
        net_savings=net_savings,
        savings_rate=savings_rate,
        income_categories=income_categories,
        expense_categories=expense_categories,
        top_merchants=top_merchants,
        unusual_expenses=unusual_expenses,
        insights=insights,
    )


def _detect_unusual_expenses(expense_categories: list[CategorySummary]) -> list[CategorySummary]:
    if len(expense_categories) < 2:
        return []

    totals = pd.Series([item.total for item in expense_categories])
    mean_value = totals.mean()
    std_value = totals.std(ddof=0)
    threshold = max(mean_value * 1.5, mean_value + std_value)

    return [item for item in expense_categories if item.total >= threshold]


def _build_insights(
    total_income: float,
    total_expenses: float,
    net_savings: float,
    savings_rate: float,
    expense_categories: list[CategorySummary],
    unusual_expenses: list[CategorySummary],
) -> list[str]:
    insights: list[str] = []

    if total_income == 0:
        insights.append("No income categories were found. Add rows with categories like Salary or Pension.")
    if total_expenses == 0:
        insights.append("No expense categories were found.")

    if total_income and total_expenses:
        if savings_rate >= 20:
            insights.append(f"You are saving {savings_rate:.1f}% of income, which is a healthy rate.")
        elif savings_rate >= 0:
            insights.append(f"You are saving {savings_rate:.1f}% of income. Consider targeting 20% or more.")
        else:
            insights.append(
                f"Expenses exceed income by ${abs(net_savings):,.2f}. Review your largest spending categories."
            )

    if expense_categories:
        largest = expense_categories[0]
        insights.append(
            f"Largest expense category is {largest.category} at ${largest.total:,.2f} "
            f"({largest.pct_of_expenses:.1f}% of expenses, {largest.pct_of_income:.1f}% of income)."
        )

    for item in unusual_expenses[:3]:
        insights.append(
            f"{item.category} looks unusually high at ${item.total:,.2f} "
            f"({item.pct_of_expenses:.1f}% of total expenses)."
        )

    return insights
